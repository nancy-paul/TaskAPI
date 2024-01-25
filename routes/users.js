// var secrets = require('../config/secrets');
var User = require('../models/user.js');
var Task = require('../models/task.js');

const mongoose = require('mongoose'); // for valid object ids
// const moment = require('moment'); // for valid dates

module.exports = function (router) {
    // var homeRoute = router.route('/');
    var usersRoute = router.route('/users');

    // homeRoute.get(function (req, res) {
    usersRoute.get(async function (req, res) { // Respond with a List of users
        try {
            const {where, sort, select, skip, limit, count} = req.query; // JSON encoded query string parameters
            const query = User.find()
            // checking if the query parameters are valid JSON before parsing them
                .where(where ? JSON.parse(where) : {})
                .sort(sort ? JSON.parse(sort) : {})
                .select(select ? JSON.parse(select) : {})
                .skip(skip ? parseInt(skip) : 0)
                .limit(limit ? parseInt(limit) : 0);
            const users = await query;
            if (count) { // count = true
                res.status(200).json({message: 'SUCCESS', data: users.length});
                return;
            }
            // else if (count == false) {
            //  res.status(200).json({message: 'SUCCESS', data: users});
            //  return;
            // } 
            else {
                if (users.length) { // count == false
                    res.status(200).json({message: 'SUCCESS', data: users});
                    return;
                } 
                else { 
                    res.status(404).json({message: 'ERROR: USERS NOT FOUND', data: {}});
                    return;
                }
            }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {}});
        }
    });

    usersRoute.post(async function (req, res) { // Create a new user. Respond with details of new user
        try {
            const name = req.body.name;
            const email = req.body.email;
            const pendingTasks = req.body.pendingTasks;
            const dateCreated = req.body.dateCreated;
            const query = User.findOne({email: email});
            const existingEmail = await query;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            // server side validation for:
            // Users cannot be created (or updated) without a name or email.
            if (!name || !email) {
                res.status(400).json({message: 'ERROR: USER NAME AND EMAIL ARE REQUIRED', data: {}});
                return;
            }
            // Multiple users with the same email cannot exist.
            if (existingEmail) {
                res.status(400).json({message: 'ERROR: USER EMAIL ALREADY EXISTS', data: existingEmail});
                return;
            }
            // checking corner edge cases - check provided email format for invalid client requests 
            if (!emailRegex.test(email)) {
                res.status(400).json({message: 'ERROR: INVALID EMAIL FORMAT', data: {}});
                return;
            } 
            // checking corner edge cases - check provided pendingTasks for invalid client requests 
            if (pendingTasks) {
                const tasksExist = await Task.find({_id: {$in: pendingTasks}});
                if (tasksExist.length !== pendingTasks.length) {
                    res.status(404).json({message: 'ERROR: PENDING TASK ID DOES NOT EXIST, NOT FOUND', data: {}}); 
                    return;
                }
            }
            // // checking corner edge cases - check provided date format for invalid client requests 
            // if (dateCreated){
            //     if (!moment(dateCreated, ['YYYY-MM-DD', moment.ISO_8601], true).isValid()) {
            //         res.status(400).json({message: 'ERROR: INVALID DATE FORMAT, PLEASE PROVIDE AS YYYY-MM-DD', data: {}});
            //         return;
            //     }
            // }
            // else {
            
            const newUser = new User({name: name, email: email, pendingTasks: pendingTasks, dateCreated: dateCreated});
            await newUser.save();            
            // two-way reference rule for data consistency when adding a new user
            await Task.updateMany({_id: {$in: pendingTasks}}, {$set: {assignedUser: newUser._id, assignedUserName: name}});
            // Update existing user's pending tasks by removing the assigned tasks
            await User.updateMany({ _id: { $ne: newUser._id }, pendingTasks: { $in: pendingTasks } }, { $pull: { pendingTasks: { $in: pendingTasks } } });

            res.status(201).json({message: 'SUCCESS: USER CREATED', data: newUser});
            // }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {}});
        }
    });
            
    // var homeRoute = router.route('/');
    var usersIdRoute = router.route('/users/:id');

    usersIdRoute.get(async function (req, res) { // Respond with details of specified user or 404 error
        try {
            const id = req.params.id;
            // checking corner edge cases - check if provided id is a valid mongoose object id 
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({message: 'ERROR: USER NOT FOUND- INVALID ID', data: {}});
                return;
            }
            // checking corner edge cases - check if select takes valid fields for invalid client requests
            const select = req.query.select ? JSON.parse(req.query.select) : {}; // select parameter
            // const query = User.findbyId({_id: id}).select(select);
            // const user = await query;
            const user = await User.findById(id).select(select);
            if (user) {
                res.status(200).json({message: 'SUCCESS', data: user});
                return;
            } 
            else { 
                res.status(404).json({message: 'ERROR: USER NOT FOUND', data: {}});
                return;
            }
        } 
        catch (e) {
            res.status(500).json({ message: 'ERROR', data: {}});
        }
    });

    usersIdRoute.put(async function (req, res) { 
        try {
            //console.log('Before processing the request');
            const id = req.params.id;
            // checking corner edge cases - check if provided id is a valid mongoose object id 
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({message: 'ERROR: USER NOT FOUND- INVALID ID', data: {}});
                return;
            }
            const name = req.body.name;
            const email = req.body.email;
            const pendingTasks = req.body.pendingTasks;  
            const dateCreated = req.body.dateCreated;  
            const query = User.findOne({_id: id});
            const existingUser = await query;
            //const emailQuery = User.findOne({email: email});
            //const existingEmail = await emailQuery;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!existingUser) {
                res.status(404).json({message: 'ERROR: USER NOT FOUND', data: {}});
                return;
            } 
            // server side validation for:
            // Users cannot be created (or updated) without a name or email.
            if (!name || !email) {
                res.status(400).json({message: 'ERROR: USER NAME AND EMAIL REQUIRED', data: {}});
                return;
            } 
            // // Multiple users with the same email cannot exist.
            // if (existingEmail) {
            //     res.status(400).json({message: 'ERROR: USER EMAIL ALREADY EXISTS', data: existingEmail});
            //     return;
            // }
            // checking corner edge cases - check provided email format for invalid client requests 
            if (!emailRegex.test(email)) {
                res.status(400).json({message: 'ERROR: INVALID EMAIL FORMAT', data: {}});
                return;
            } 
            // checking corner edge cases - check provided pendingTasks for invalid client requests 
            if (pendingTasks) {
                const tasksExist = await Task.find({_id: {$in: pendingTasks}});
                if (tasksExist.length !== pendingTasks.length) {
                    res.status(404).json({message: 'ERROR: PENDING TASK ID DOES NOT EXIST, NOT FOUND', data: {}}); 
                    return;
                }
            }
            // // checking corner edge cases - check provided date format for invalid client requests 
            // if (dateCreated){
            //     if (!moment(dateCreated, ['YYYY-MM-DD', moment.ISO_8601], true).isValid()) {
            //         res.status(400).json({ message: 'ERROR: INVALID DATE FORMAT, PLEASE PROVIDE AS YYYY-MM-DD', data: {}});
            //         return;
            //     }
            // }
            // if (existingUser) { // PUT a User with pendingTasks
            const oldPendingTasks = existingUser.pendingTasks;
            existingUser.name = name;
            existingUser.email = email;
            //existingUser.pendingTasks = pendingTasks;
            existingUser.pendingTasks = [...new Set([...oldPendingTasks, ...pendingTasks])];
            existingUser.dateCreated = dateCreated;
            await existingUser.save();  

            // assign the user to the new tasks
            await Task.updateMany({_id: {$in: pendingTasks}}, {$set: {assignedUser: id, assignedUserName: name}});

            // // Find old users with the provided pending task IDs
            // const usersToUpdate = await User.find({ pendingTasks: { $in: pendingTasks } });

            // // Update each user by removing the old user from their pending tasks
            // for (const userToUpdate of usersToUpdate) {
            //     userToUpdate.pendingTasks.pull(id);
            // await userToUpdate.save();
            // }

            res.status(200).json({ message: 'SUCCESS: USER UPDATED', data: existingUser });
            // } 
            //console.log('After processing the request successfully');  
        }
        catch (e) {
            //console.error('Error:', e);
            res.status(500).json({ message: 'ERROR', data: {} });
        }
    });

    usersIdRoute.delete(async function (req, res) { // Delete specified user or 404 error
        try {
            const id = req.params.id;
            // check if id is a valid mongoose objectid
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({ message: 'ERROR: USER NOT FOUND- INVALID ID', data: {} });
                return;
            }
            const query = User.findOne({_id: id})
            const user = await query;
            if (user) { // DELETE a User should unassign the user's pending tasks
                const pendingTaskIds = user.pendingTasks; 
                if (pendingTaskIds){
                    await Task.updateMany({_id: {$in: pendingTaskIds}}, {$set: {assignedUser: "", assignedUserName: "unassigned"}}); 
                }                
                await User.deleteOne({_id: id});
                res.status(200).json({message: 'SUCCESS: USER DELETED', data: user});
                return;
            } 
            else {
                res.status(404).json({message: 'ERROR: USER NOT FOUND', data: {}});
                return;
            }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {}});
        }
    });
    return router;
};

