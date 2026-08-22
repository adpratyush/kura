const express = require("express");
const Group = require("../models/Group");
const User = require("../models/User");

const router = express.Router();

// ======================================================
// CREATE GROUP
// POST /api/groups
// ======================================================

router.post("/", async (req, res) => {
  try {
    const {
      name,
      admin,
      members = [],
      groupPhoto = "",
    } = req.body;

    // Validate group name
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    // Validate admin
    if (!admin) {
      return res.status(400).json({
        message: "Admin is required",
      });
    }

    // Check admin exists
    const adminUser = await User.findById(admin);

    if (!adminUser) {
      return res.status(404).json({
        message: "Admin user not found",
      });
    }

    // Make sure members is an array
    let groupMembers = Array.isArray(
      members
    )
      ? members
      : [];

    // Add admin automatically
    groupMembers.push(admin);

    // Remove duplicates
    groupMembers = [
      ...new Set(
        groupMembers.map((id) =>
          id.toString()
        )
      ),
    ];

    // Check that all users exist
    const existingUsers =
      await User.find({
        _id: {
          $in: groupMembers,
        },
      }).select("_id");

    if (
      existingUsers.length !==
      groupMembers.length
    ) {
      return res.status(400).json({
        message:
          "One or more selected users do not exist",
      });
    }

    // Create group
    const group = await Group.create({
      name: name.trim(),

      admin,

      members: groupMembers,

      groupPhoto:
        groupPhoto || "",
    });

    // Populate group
    const populatedGroup =
      await Group.findById(
        group._id
      )
        .populate(
          "admin",
          "username name profilePhoto"
        )
        .populate(
          "members",
          "username name profilePhoto"
        );

    res.status(201).json({
      message:
        "Group created successfully",

      group: populatedGroup,
    });
  } catch (error) {
    console.error(
      "Create group error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// GET ALL GROUPS
// GET /api/groups
// ======================================================

router.get("/", async (req, res) => {
  try {
    const groups =
      await Group.find()
        .populate(
          "admin",
          "username name profilePhoto"
        )
        .populate(
          "members",
          "username name profilePhoto"
        )
        .sort({
          createdAt: -1,
        });

    res.json(groups);
  } catch (error) {
    console.error(
      "Get groups error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ======================================================
// GET GROUPS FOR USER
// GET /api/groups/user/:userId
// ======================================================

router.get(
  "/user/:userId",
  async (req, res) => {
    try {
      const { userId } =
        req.params;

      // Check user exists
      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      const groups =
        await Group.find({
          members: userId,
        })
          .populate(
            "admin",
            "username name profilePhoto"
          )
          .populate(
            "members",
            "username name profilePhoto"
          )
          .sort({
            createdAt: -1,
          });

      res.json(groups);
    } catch (error) {
      console.error(
        "Get user groups error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// GET SINGLE GROUP
// GET /api/groups/:groupId
// ======================================================

router.get(
  "/:groupId",
  async (req, res) => {
    try {
      const group =
        await Group.findById(
          req.params.groupId
        )
          .populate(
            "admin",
            "username name profilePhoto"
          )
          .populate(
            "members",
            "username name profilePhoto"
          );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      res.json(group);
    } catch (error) {
      console.error(
        "Get group error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// ADD MEMBER
// POST /api/groups/:groupId/members
// ======================================================

router.post(
  "/:groupId/members",
  async (req, res) => {
    try {
      const {
        userId,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required",
        });
      }

      const group =
        await Group.findById(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // Check if already member
      const alreadyMember =
        group.members.some(
          (member) =>
            member.toString() ===
            userId.toString()
        );

      if (alreadyMember) {
        return res.status(400).json({
          message:
            "User is already a member",
        });
      }

      group.members.push(
        userId
      );

      await group.save();

      const updatedGroup =
        await Group.findById(
          group._id
        )
          .populate(
            "admin",
            "username name profilePhoto"
          )
          .populate(
            "members",
            "username name profilePhoto"
          );

      res.json({
        message:
          "Member added successfully",

        group:
          updatedGroup,
      });
    } catch (error) {
      console.error(
        "Add member error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// REMOVE MEMBER
// DELETE /api/groups/:groupId/members/:userId
// ======================================================

router.delete(
  "/:groupId/members/:userId",
  async (req, res) => {
    try {
      const {
        groupId,
        userId,
      } = req.params;

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      // Admin cannot be removed
      if (
        group.admin.toString() ===
        userId.toString()
      ) {
        return res.status(400).json({
          message:
            "Admin cannot be removed from the group",
        });
      }

      const isMember =
        group.members.some(
          (member) =>
            member.toString() ===
            userId.toString()
        );

      if (!isMember) {
        return res.status(400).json({
          message:
            "User is not a member of this group",
        });
      }

      group.members =
        group.members.filter(
          (member) =>
            member.toString() !==
            userId.toString()
        );

      await group.save();

      const updatedGroup =
        await Group.findById(
          group._id
        )
          .populate(
            "admin",
            "username name profilePhoto"
          )
          .populate(
            "members",
            "username name profilePhoto"
          );

      res.json({
        message:
          "Member removed successfully",

        group:
          updatedGroup,
      });
    } catch (error) {
      console.error(
        "Remove member error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// UPDATE GROUP
// PUT /api/groups/:groupId
// ======================================================

router.put(
  "/:groupId",
  async (req, res) => {
    try {
      const {
        name,
        groupPhoto,
      } = req.body;

      const group =
        await Group.findById(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      if (
        name !== undefined
      ) {
        if (!name.trim()) {
          return res.status(400).json({
            message:
              "Group name cannot be empty",
          });
        }

        group.name =
          name.trim();
      }

      if (
        groupPhoto !==
        undefined
      ) {
        group.groupPhoto =
          groupPhoto;
      }

      await group.save();

      const updatedGroup =
        await Group.findById(
          group._id
        )
          .populate(
            "admin",
            "username name profilePhoto"
          )
          .populate(
            "members",
            "username name profilePhoto"
          );

      res.json({
        message:
          "Group updated successfully",

        group:
          updatedGroup,
      });
    } catch (error) {
      console.error(
        "Update group error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ======================================================
// DELETE GROUP
// DELETE /api/groups/:groupId
// ======================================================

router.delete(
  "/:groupId",
  async (req, res) => {
    try {
      const group =
        await Group.findById(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      await Group.findByIdAndDelete(
        req.params.groupId
      );

      res.json({
        message:
          "Group deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete group error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;