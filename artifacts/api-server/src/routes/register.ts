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
    const { name, image } = req.body;

    if (!name || !image) {
      res.status(400).json({ success: false, error: "Name and image are required" });
      return;
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      res.status(400).json({ success: false, error: "Name cannot be empty" });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.name, trimmedName))
      .limit(1);

    if (existing.length > 0) {
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
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `User "${trimmedName}" registered successfully`,
      user: {
        id: user.id,
        name: user.name,
        imagePath: user.imagePath,
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
        registeredAt: u.registeredAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching users");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
