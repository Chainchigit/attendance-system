import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post("/register", async (req, res) => {
  try {
    const { name, image, faceDescriptor } = req.body;

    if (!name || !image) {
      res.status(400).json({ success: false, error: "Name and image are required" });
      return;
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      res.status(400).json({ success: false, error: "Name cannot be empty" });
      return;
    }

    const parsedDescriptor = faceDescriptor && Array.isArray(faceDescriptor)
      ? (faceDescriptor as number[])
      : null;

    if (parsedDescriptor && parsedDescriptor.length !== 128) {
      res.status(400).json({ success: false, error: "Invalid face descriptor — expected 128 values" });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.name, trimmedName))
      .limit(1);

    if (existing.length > 0) {
      if (parsedDescriptor) {
        await db
          .update(usersTable)
          .set({ faceDescriptor: parsedDescriptor })
          .where(eq(usersTable.name, trimmedName));

        const updated = existing[0];
        res.status(200).json({
          success: true,
          message: `Face descriptor updated for "${trimmedName}"`,
          user: {
            id: updated.id,
            name: updated.name,
            imagePath: updated.imagePath,
            hasFaceDescriptor: true,
            registeredAt: updated.registeredAt,
          },
        });
        return;
      }

      res.status(409).json({ success: false, error: `User "${trimmedName}" is already registered` });
      return;
    }

    const base64Data = String(image).replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filename = `${Date.now()}_${trimmedName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const [user] = await db
      .insert(usersTable)
      .values({
        name: trimmedName,
        imagePath: `/uploads/${filename}`,
        faceDescriptor: parsedDescriptor,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `User "${trimmedName}" registered successfully`,
      user: {
        id: user.id,
        name: user.name,
        imagePath: user.imagePath,
        hasFaceDescriptor: !!user.faceDescriptor,
        registeredAt: user.registeredAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error registering user");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        imagePath: u.imagePath,
        hasFaceDescriptor: !!u.faceDescriptor,
        registeredAt: u.registeredAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching users");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/users/descriptors", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        faceDescriptor: usersTable.faceDescriptor,
      })
      .from(usersTable)
      .orderBy(usersTable.name);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        faceDescriptor: u.faceDescriptor ?? undefined,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching user descriptors");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
