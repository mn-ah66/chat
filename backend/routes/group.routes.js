import express from "express";
import {
    createGroup,
    sendMessageToGroup,
    removeGroupMember,
    addMemberToGroup, getGroupMessages, getGroupList,
} from "../controllers/message.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.post("/:groupId/message", protectRoute, sendMessageToGroup);
router.put("/:groupId/add-member", protectRoute, addMemberToGroup);
router.put("/:groupId/remove-member", protectRoute, removeGroupMember);
router.get('/:groupId/messages', protectRoute, getGroupMessages);
router.get('/', protectRoute, getGroupList);
export default router;
