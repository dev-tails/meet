import express from 'express';
import yup from 'yup';

import { ObjectId } from '../Database.js';
import { UnauthorizedError } from '../middleware/AuthMiddleware.js';
import { AuthRequiredMiddleware } from '../middleware/AuthRequiredMiddleware.js';
import NoteSchema from '../schemas/NoteSchema.js';
import { handleNewNote } from '../vendor/zapier/Zapier.js';

export function initializeNotesRouter() {
  const router = express.Router();
  router.use(AuthRequiredMiddleware);

  router.get("", async function (req, res) {
    const { user, db } = req;

    const querySchema = yup.object().shape({
      count: yup.number(),
      type: yup.string().nullable(),
      date: yup.string(),
      before: yup.date(),
      since: yup.date(),
      sort: yup.string().oneOf(["start"]),
      lastSyncDate: yup.date().nullable(),
    });
    const parsedQuery = querySchema.cast(req.query);

    const { count, since, date, before, type, sort, lastSyncDate } =
      parsedQuery;

    let findOptions = {
      user: ObjectId(user),
    };

    if (since && before) {
      findOptions.start = {
        $gte: since,
        $lte: before,
      };
    } else if (since) {
      findOptions.start = {
        $gte: since,
      };
    } else if (before) {
      findOptions.start = {
        $lte: before,
      };
    }

    if (type) {
      if (type !== "task") {
        findOptions.type = type;
      } else {
        findOptions.type = {
          $in: ["task", "task_completed"],
        };
      }
    }

    if (date) {
      findOptions.date = date;
    }

    if (lastSyncDate) {
      findOptions.syncedAt = {
        $gt: lastSyncDate,
      };
    }

    const query = db.collection("notes").find(findOptions);

    if (count) {
      query.limit(count);
    }

    if (sort) {
      query.sort({
        [sort]: 1,
      });
    }

    const notes = await query.toArray();

    const notesSchema = yup.array().of(NoteSchema);

    const notesToReturn = notesSchema.cast(notes, { stripUnknown: true });

    return res.json(notesToReturn);
  });

  router.get("/search", async function (req, res) {
    const { user, db, query } = req;
    const searchQuery = db.collection("notes").find({
      user: ObjectId(user),
      $text: { $search: query.search }
    }).sort({ date: -1 }).limit(100);

    const notes = await searchQuery.toArray();
    return res.json({
      data: notes
    });
  });

  router.get("/:id", async function (req, res) {
    const { user, db } = req;

    const topLevelNote = await db.collection("notes").findOne({
      _id: ObjectId(req.params.id),
    });

    async function userHasAccessToNote(note, user) {
      if (String(note.user) === String(user)) {
        return true;
      }

      if (note.permissions && note.permissions.length) {
        const userDocument = await db.collection("users").findOne({
          _id: ObjectId(user),
        });

        const permissionForEmail = note.permissions.find((permission) => {
          return permission.email === userDocument.email;
        });
        if (permissionForEmail) {
          return true;
        } else {
          return false;
        }
      }
    }

    const hasAccess = await userHasAccessToNote(topLevelNote, user);
    if (!hasAccess) {
      throw new UnauthorizedError();
    }

    let notesToReturn = [topLevelNote];

    let depth = 1;
    const maxDepth = 10;
    let parentIds = [ObjectId(req.params.id)];
    do {
      const childrenNotes = await db
        .collection("notes")
        .find({
          parent: {
            $in: parentIds,
          },
        })
        .toArray();

      parentIds = childrenNotes.map((childNote) => childNote._id);

      notesToReturn = [...notesToReturn, ...childrenNotes];
      depth++;
    } while (parentIds.length > 0 && depth < maxDepth);

    return res.json(notesToReturn);
  });

  router.put("/:id", async function (req, res) {
    const { id } = req.params;
    const { user, db } = req;

    const bodySchema = yup.object().shape({
      start: yup.date(),
      body: yup.string(),
      content: yup.string(),
      date: yup.string(),
      encryptedBody: yup.string(),
      iv: yup.string(),
      type: yup.string(),
      parent: yup.string(),
      prev: yup.string(),
      archived: yup.boolean(),
      checked: yup.boolean(),
      localId: yup.string(),
      permissions: yup.array().of(
        yup.object().shape({
          email: yup.string(),
          role: yup.string().oneOf(["r", "w"]),
        })
      ),
      createdAt: yup.date(),
      updatedAt: yup.date(),
    });

    const update = await bodySchema.validate(req.body, { stripUnknown: true });

    const Note = db.collection("notes");

    let findOptions = {
      localId: id,
    };
    if (ObjectId.isValid(id)) {
      findOptions = {
        _id: ObjectId(id),
      };
    }

    const note = await Note.findOne(findOptions);

    if (!note || String(note.user) !== user) {
      throw new UnauthorizedError();
    }

    const updateResultOp = await Note.updateOne(
      {
        _id: note._id,
      },
      {
        $set: {
          ...update,
          syncedAt: new Date(),
        },
      }
    );

    const updatedNote = await db.collection("notes").findOne({
      _id: note._id,
    });

    return res.json(updatedNote);
  });

  router.post("", async function (req, res) {
    const bodySchema = yup.object().shape({
      start: yup.date(),
      date: yup.string(),
      body: yup.string(),
      content: yup.string(),
      encryptedBody: yup.string(),
      iv: yup.string(),
      type: yup.string().default("note"),
      parent: yup.string(),
      prev: yup.string(),
      localId: yup.string(),
      createdAt: yup.date(),
      updatedAt: yup.date(),
    });

    const noteToCreate = await bodySchema.validate(req.body, {
      stripUnknown: true,
    });

    const { user, db } = req;

    const insertOpResult = await db.collection("notes").insertOne({
      user: ObjectId(user),
      ...noteToCreate,
      syncedAt: new Date(),
    });

    const newNote = await db.collection("notes").findOne({
      _id: insertOpResult.insertedId,
    });

    await handleNewNote(db, newNote, user);

    return res.json(newNote);
  });

  router.delete("/:id", async function (req, res) {
    const { id } = req.params;
    const { user, db } = req;

    await db
      .collection("notes")
      .deleteOne({ _id: ObjectId(id), user: ObjectId(user) });

    return res.json();
  });

  return router;
}
