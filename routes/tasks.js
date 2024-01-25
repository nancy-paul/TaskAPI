// var secrets = require('../config/secrets');
var User = require('../models/user.js');
var Task = require('../models/task.js');

const mongoose = require('mongoose'); // for valid object ids 
// const moment = require('moment'); // for valid dates

module.exports = function (router) {

    // var homeRoute = router.route('/');
    var tasksRoute = router.route('/tasks');

    // homeRoute.get(function (req, res) { // Respond with a List of tasks
    tasksRoute.get(async function (req, res) {
        try {
            const {where, sort, select, skip, limit, count} = req.query; // JSON encoded query string parameters
            const query = Task.find()
            // checking if the query parameters are valid JSON before parsing them
            .where(where ? JSON.parse(where) : {})
            .sort(sort ? JSON.parse(sort) : {})
            .select(select ? JSON.parse(select) : {})
            .skip(skip ? parseInt(skip) : 0)
            .limit(limit ? parseInt(limit) : 0);
            const tasks = await query;
            if (count) { // count = true
                res.status(200).json({message: 'SUCCESS', data: tasks.length});
                return;
            }
        //  else if (count == false) {
        //      res.status(200).json({message: 'SUCCESS', data: tasks});
        //      return;
        //  }
            else {
                if (tasks.length) { // count == false
                    res.status(200).json({message: 'SUCCESS', data: tasks});
                    return;
                } 
                else { // count == false
                    res.status(404).json({message: 'ERROR: TASKS NOT FOUND', data: {}});
                    return;
                }
            }
        }  
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {} });
        }
    });

    tasksRoute.post(async function (req, res) { // Create a new task. Respond with details of new task
        try {
            //console.log('Before processing the request');
            const name = req.body.name;
            const description = req.body.description;
            const deadline = req.body.deadline;
            let completed;
            //const completed = req.body.completed ? Boolean(req.body.completed) : false; // since adding to todo list
            if (typeof req.body.completed === 'string') {
                completed = req.body.completed.toLowerCase() === 'true';
            } else {
                completed = false;
            }
            const assignedUser = req.body.assignedUser; 
            const assignedUserName = req.body.assignedUserName;
            const dateCreated = req.body.dateCreated;

            // server side validation for:
            // Tasks cannot be created (or updated) without a name or deadline
            if (!name || !deadline) {
                res.status(400).json({ message: 'ERROR: TASK NAME AND DEADLINE REQUIRED', data: {} });
                return;
            }
            if (assignedUser) {
                const userExist = await User.findOne({ _id: assignedUser });

                if (!userExist) {
                    res.status(404).json({ message: 'ERROR: ASSIGNED USER DOES NOT EXIST, NOT FOUND', data: {} });
                    return;
                }

                const newTask = new Task({
                    name: name,
                    description: description,
                    deadline: deadline,
                    completed: completed,
                    assignedUser: assignedUser,
                    assignedUserName: userExist.name,
                    dateCreated: dateCreated
                });

                await newTask.save();
                

                await User.updateOne({ _id: assignedUser }, { $addToSet: { pendingTasks: newTask._id } });
                res.status(201).json({ message: 'SUCCESS: TASK CREATED', data: newTask });
            } 
            else {
                // Handle the case where assignedUser is not provided
                const newTask = new Task({
                    name: name,
                    description: description,
                    deadline: deadline,
                    completed: completed,
                    dateCreated: dateCreated
                });

                await newTask.save();
                res.status(201).json({ message: 'SUCCESS: TASK CREATED', data: newTask });
            }
            //console.log('After processing the request successfully');
        } catch (e) {
            //console.error('Error:', e);
            res.status(500).json({ message: 'ERROR: SERVER ERROR', data: {} });
        }
    });
    // var homeRoute = router.route('/');
    var tasksIdRoute = router.route('/tasks/:id');

    // homeRoute.get(function (req, res) {
    tasksIdRoute.get(async function (req, res) { // Respond with details of specified task or 404 error
        try {
            const id = req.params.id;
            // checking corner edge cases - check if provided id is a valid mongoose object id 
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({message: 'ERROR: TASK NOT FOUND- INVALID ID', data: {} });
                return;
            }
            const select = req.query.select ? JSON.parse(req.query.select) : {}; // select parameter
            const query = Task.findOne({ _id: id }).select(select);
            const task = await query;
            if (task) {
                res.status(200).json({message: 'SUCCESS', data: task});
                return;
            } 
            else {
                res.status(404).json({message: 'ERROR: TASK NOT FOUND', data: {}});
                return;
            }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {}});
        }
    });

    tasksIdRoute.put(async function (req, res) { // Replace entire task with supplied task or 404 error
        try {
            const id = req.params.id;
            // checking corner edge cases - check if provided id is a valid mongoose object id 
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({ message: 'ERROR: TASK NOT FOUND- INVALID ID', data: {} });
                return;
            }
            const name = req.body.name;
            const description = req.body.description;
            const deadline = req.body.deadline;
            //const completed = req.body.completed ? req.body.completed : false; // since adding to todo list
            let completed;
            //const completed = req.body.completed ? Boolean(req.body.completed) : false; // since adding to todo list
            if (typeof req.body.completed === 'string') {
                completed = req.body.completed.toLowerCase() === 'true';
            } else {
                completed = false;
            }
            const assignedUser = req.body.assignedUser; 
            const assignedUserName = req.body.assignedUserName; 
            const dateCreated = req.body.dateCreated;
            const query = Task.findOne({_id: id});
            const existingTask = await query;
            if (!existingTask) {
                res.status(404).json({message: 'ERROR: TASK NOT FOUND', data: {}});
                return;
            } 
            // server side validation for:
            // Tasks cannot be created (or updated) without a name or deadline
            if (!name || !deadline) {
                res.status(400).json({message: 'ERROR: NAME AND DEADLINE REQUIRED', data: {}});
                return;
            }
            // // checking corner edge cases - check provided date format for invalid client requests 
            // if (deadline){
            //     if (!moment(deadline, ['YYYY-MM-DD', moment.ISO_8601], true).isValid()) {
            //         res.status(400).json({message: 'ERROR: INVALID DATE FORMAT FOR DEADLINE, PLEASE PROVIDE AS YYYY-MM-DD', data: {}});
            //         return;
            //     }
            // }
            // // checking corner edge cases - check provided date format for invalid client requests 
            // if (dateCreated){
            //     if (!moment(dateCreated, ['YYYY-MM-DD', moment.ISO_8601], true).isValid()) {
            //         res.status(400).json({message: 'ERROR: INVALID DATE FORMAT FOR DATE CREATED, PLEASE PROVIDE AS YYYY-MM-DD', data: {}});
            //         return;
            //     }
            // }
            // whether an assigned user name is given or not, assigned user name will update based on assigned user id
            if (assignedUser) {
                const userExist = await User.findOne({_id: assignedUser});
                if (!userExist) {
                    res.status(404).json({message: 'ERROR: ASSIGNED USER DOES NOT EXIST, NOT FOUND', data: {}}); 
                    return;
                }
                const newTask = {name: name, description: description, deadline: deadline, completed: completed,
                    assignedUser: assignedUser, assignedUserName: userExist.name, dateCreated: dateCreated};                    
                await Task.updateOne({_id: id}, newTask);

                // assign the task to the new user
                await User.updateOne({_id: assignedUser}, {$addToSet: {pendingTasks: id}}); 

                // unassign the task from the old users
                if (existingTask.assignedUser) {
                    await User.updateOne({_id: existingTask.assignedUser}, {$pull: {pendingTasks: id}});
                }
                res.status(200).json({message: 'SUCCESS: TASK UPDATED', data: newTask});
            }
            else{
                // Handle the case where assignedUser is not provided
                const newTask = new Task({
                    name: name,
                    description: description,
                    deadline: deadline,
                    completed: completed
                });

                await Task.updateOne({_id: id}, newTask);
                res.status(200).json({message: 'SUCCESS: TASK UPDATED', data: newTask});
            }
            // unassign the task from the old users
            if (existingTask.assignedUser) {
                await User.updateOne({_id: existingTask.assignedUser}, {$pull: {pendingTasks: id}});
            }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR', data: {}});
        }
    });

    tasksIdRoute.delete(async function (req, res) { // Delete specified user or 404 error
        try {
            const id = req.params.id;
            // check if id is a valid mongoose objectid
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(404).json({message: 'ERROR: TASK NOT FOUND- INVALID ID', data: {} });
                return;
            }
            const query = Task.findOne({_id: id})
            const task = await query;
            if (task) { // DELETE a Task should remove the task from its assignedUser's pendingTasks
                const assignedUser = task.assignedUser; 
                if (assignedUser){
                    await User.updateOne({_id: assignedUser}, {$pull: { pendingTasks: id}});
                }
                await Task.deleteOne({_id: id});
                res.status(200).json({message: 'SUCCESS: TASK DELETED', data: task});
                return;
            } 
            else {
                res.status(404).json({message: 'ERROR: TASK NOT FOUND', data: {}});
                return;
            }
        } 
        catch (e) {
            res.status(500).json({message: 'ERROR: SERVER ERROR.', data: {}});
        }
    });

    return router;
};
