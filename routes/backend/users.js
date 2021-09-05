const express = require("express");
const csrf = require("csurf");
const passport = require("passport");
const path = require("path");
const LocalStrategy = require("passport-local").Strategy;
const Product = require("../../models/product");
const Order = require("../../models/order");
const User = require("../../models/user");
const Cart = require("../../models/cart");
const middleware = require("../../middleware");
const dirPath = path.join(__dirname, '..', '..', 'public');
const {
    signUpValidationRules,
    signInValidationRules,
    validateSignup,
    validateSignin,
    accessFile,
    moveFile,
} = require("../../config/validator");
const fs = require('fs-extra');

const app = express();
const csrfProtection = csrf();
app.use(csrfProtection);

// GET: display all users
app.get("/", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const successMsg = await req.consumeFlash('success');
    const errorMsg = await req.consumeFlash('error');
    const perPage = 8;
    let page = parseInt(req.query.page) || 1;
  
    try {
        const users = await User.find({})
        .sort("-createdAt")
        .skip(perPage * page - perPage)
        .limit(perPage);

        const count = await User.countDocuments();

        res.render("backend/users/index", {
            pageName: "All Users",
            users,
            successMsg,
            errorMsg,
            current: page,      
            home: "/admin/users/?",
            pages: Math.ceil(count / perPage),
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/users");
    }
});


// GET: create a user
app.get("/createUser", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {  
    
    try {       
        const successMsg = await req.consumeFlash('success');
        const errorMsg = await req.consumeFlash('error');
        res.render("backend/users/createUser", {           
            pageName: 'Create User',
            csrfToken: req.csrfToken(),
            successMsg,
            errorMsg,
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/users");
    }
});

// POST: create user
app.post("/createUser", 
    [    
        signUpValidationRules(),
        validateSignup,
        passport.authenticate("local.signup", {
            successRedirect: "/admin/users",
            failureRedirect: "/admin/users/createUser",
            failureFlash: true,
            session: false // prevent auto-login
        }),
    ],
    async (req, res) => {  
        req.flash("success", "User Created Successfully");
        res.redirect("/admin/users");
    }
);

// GET: display a user by its id to update
app.get('/:id', middleware.isLoggedIn, middleware.isAdmin, async (req, res) =>{
    const userId = req.params.id;
    try {
        const user = await User.findById(userId);
    
        if(user){      
            res.render('backend/users/editUser', {pageName: 'Update User', user, csrfToken: req.csrfToken(),});
        }
    } catch (error) {
        console.log(error);
        res.redirect("/");
    }  
    
  });

// POST: update user
app.post('/updateUser', async (req, res) => {
    const userId = req.body.updateId;
    const username= req.body.name;
    const role= req.body.role;  
  
    try {
        const user = await User.findById(userId);

        // check if image is uploaded or not
        if(req.files){
            const userImage = req.files.userImage;

            const imageName = (userImage.name).replace(/ /g, '_');
            const uploadPath = dirPath + '/images/' + imageName;
            const imagePath = '/images/'+ imageName;

            // remove the previous image from the images folder
            const userImagePath = user.userImagePath;
            if(userImagePath){
                const filePath = dirPath + userImagePath;

                accessFile(filePath);
            }

            // set the userImagePath with the new imagePath
            user.userImagePath = imagePath;
            
            // move the updated user image to images folder
            moveFile(userImage, uploadPath);
            
        }else {
            // set userImagePath if image not uploaded
            user.userImagePath = user.userImagePath;            
        }
        user.email;
        user.password;
        user.username = username;
        user.role = role;      

        await user.save(async (err, newUser) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
    
            req.flash("success", "User Updated Successfully");
            res.redirect("/admin/users");
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin");
    }
});


// GET: delete a user
app.get('/deleteUser/:deleteId', middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const userId = req.params.deleteId;

    const foundUser = await User.findById(userId);
    const userImagePath = foundUser.userImagePath;

    try {

        const filePath = dirPath + userImagePath;
        if(userImagePath){
            accessFile(filePath);
        }

        User.findByIdAndDelete(userId, async (err, deleteUser) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
            req.flash("success", "User Deleted Successfully");
            res.redirect("/admin/users");
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/users");
    }
  
});

module.exports = app;
