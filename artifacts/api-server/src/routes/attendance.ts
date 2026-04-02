import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { attendanceTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/attendance", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const trimmedName = String(name).trim();

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.name, trimmedName))
      .limit(1);

    if (users.length === 0) {
      res.status(400).json({ success: false, error: `User "${trimmedName}" is not registered` });
      return;
    }

    const user = users[0];
    const today = new Date().toISOString().split("T")[0];

    const existingToday = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.userId, user.id),
          eq(attendanceTable.date, today)
        )
      )
      .orderBy(attendanceTable.timestamp);

    if (existingToday.length >= 2) {
      res.status(409).json({
        success: false,
        error: `"${trimmedName}" has already checked in and out today`,
      });
      return;
    }

    const attendanceType = existingToday.length === 0 ? "check_in" : "check_out";

    const [record] = await db
      .insert(attendanceTable)
      .values({
        userId: user.id,
        userName: trimmedName,
        date: today,
        type: attendanceType,
      })
      .returning();

    res.status(201).json({
      id: record.id,
      userId: record.userId,
      userName: record.userName,
      date: record.date,
      type: record.type,
      timestamp: record.timestamp,
    });
  } catch (err) {
    req.log.error({ err }, "Error marking attendance");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const records = await db
      .select()
      .from(attendanceTable)
      .orderBy(attendanceTable.timestamp);

    res.json({
      records: records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        date: r.date,
        type: r.type,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching attendance");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
