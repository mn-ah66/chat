import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import Group from '../models/group.model.js';

export const sendMessage = async (req, res) => {
	try {
		const { message } = req.body;
		const { id: receiverId } = req.params;
		const senderId = req.user._id;

		let conversation = await Conversation.findOne({
			participants: { $all: [senderId, receiverId] },
		});

		if (!conversation) {
			conversation = await Conversation.create({
				participants: [senderId, receiverId],
			});
		}

		const newMessage = new Message({
			senderId,
			receiverId,
			message,
		});

		if (newMessage) {
			conversation.messages.push(newMessage._id);
		}

		// await conversation.save();
		// await newMessage.save();

		// this will run in parallel
		await Promise.all([conversation.save(), newMessage.save()]);

		// SOCKET IO FUNCTIONALITY WILL GO HERE
		const receiverSocketId = getReceiverSocketId(receiverId);
		if (receiverSocketId) {
			// io.to(<socket_id>).emit() used to send events to specific client
			io.to(receiverSocketId).emit("newMessage", newMessage);
		}

		res.status(201).json(newMessage);
	} catch (error) {
		console.log("Error in sendMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getMessages = async (req, res) => {
	try {
		const { id: userToChatId } = req.params;
		const senderId = req.user._id;

		const conversation = await Conversation.findOne({
			participants: { $all: [senderId, userToChatId] },
		}).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

		if (!conversation) return res.status(200).json([]);

		const messages = conversation.messages;

		res.status(200).json(messages);
	} catch (error) {
		console.log("Error in getMessages controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
export const createGroup = async  (req, res) => {
	const { groupName, adminId, memberIds } = req.body;
	try {
		const newGroup = new Group({
			groupName,
			admin: adminId,
			members: memberIds,
		});

		await newGroup.save();
		if (!newGroup) return res.status(200).json([]);
		res.status(201).json(newGroup);
	} catch (error) {
	res.status(500).json({ error: error.message });
}

};
export const sendMessageToGroup = async (req, res) => {
	const { groupId } = req.params;
	const { senderId, messageText } = req.body;
	try {
	const newMessage = new Message({
		senderId,
		receiverId: groupId,
		message: messageText,
	});

	await newMessage.save();
		if (!newMessage) return res.status(200).json([]);
	const group = await Group.findById(groupId);
	group.messages.push(newMessage._id);
	await group.save();

		res.status(201).json(newMessage);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
export const removeGroupMember = async (req, res) => {
	const { groupId } = req.params;
	const { adminId, memberIdToRemove } = req.body;
	try {

		const group = await Group.findById(groupId);


		if (group.admin.toString() !== adminId) {
			throw new Error('Only the group admin can remove members');
		}

		const memberIndex = group.members.indexOf(memberIdToRemove);
		if (memberIndex === -1) {
			throw new Error('Member not found in the group');
		}

		group.members.splice(memberIndex, 1);

		await group.save();
		res.status(200).json(group);

	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
export const addMemberToGroup = async (req, res) => {
	const { groupId } = req.params;
	const { adminId, newMemberId } = req.body;

	try {

		const group = await Group.findById(groupId);

		if (group.admin.toString() !== adminId) {
			throw new Error('Only the group admin can add new members');
		}

		if (group.members.includes(newMemberId)) {
			throw new Error('User is already a member of the group');
		}

		group.members.push(newMemberId);

		await group.save();
		res.status(200).json(group);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const getGroupMessages = async (req, res) => {
	const { groupId } = req.params;

	try {

		const group = await Group.findById(groupId).populate({
			path: 'messages',
			populate: {
				path: 'senderId',
				select: 'username fullName profilePic', // Select fields to return from the user
			},
		});

		if (!group) {
			return res.status(404).json({ error: 'Group not found' });
		}

		res.status(200).json(group.messages);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
export const getGroupList = async (req, res) => {
	try {

		const groups = await Group.find()
			.populate('admin', 'username fullName profilePic') // Populate admin details
			.populate('members', 'username fullName profilePic'); // Populate member details

		res.status(200).json(groups);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
