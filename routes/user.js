const express = require("express");
const csrf = require("csurf");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const path = require("path");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const Cart = require("../models/cart");
const middleware = require("../middleware");
const dirPath = path.join(__dirname, '..', 'public');
const fs = require('fs-extra');
const {
    signUpValidationRules,
    signInValidationRules,
    validateSignup,
    validateSignin,
    accessFile,
    moveFile,
} = require("../config/validator");
const issueToken = require("../config/passport");
const csrfProtection = csrf();

const app = express();
app.use(csrfProtection);

// GET: display the signup form with csrf token
app.get("/signup", middleware.isNotLoggedIn, (req, res) => {
    const errorMsg = req.consumeFlash("error");  
    res.render("user/signup", {
        csrfToken: req.csrfToken(),
        errorMsg,
        pageName: "Sign Up",    
    });
});

// POST: handle the signup logic
app.post("/signup",
[
    middleware.isNotLoggedIn,
    signUpValidationRules(),
    validateSignup,
    passport.authenticate("local.signup", {
        successRedirect: "/user/profile",
        failureRedirect: "/user/signup",
        failureFlash: true,
    }),
],
async (req, res) => {
    try {
        //if there is cart session, save it to the user's cart in db
        if (req.session.cart) {
            const cart = await new Cart(req.session.cart);
            cart.user = req.user._id;
            await cart.save();
        }
        // redirect to the previous URL
        if (req.session.oldUrl) {
            var oldUrl = req.session.oldUrl;
            req.session.oldUrl = null;
            res.redirect(oldUrl);
        } else {
            res.redirect("/user/profile");
        }
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("/");
    }
});

// GET: display the signin form with csrf token
app.get("/signin", middleware.isNotLoggedIn, (req, res) => {
    const errorMsg = req.consumeFlash("error");  
    res.render("user/signin", {
        csrfToken: req.csrfToken(),
        errorMsg,
        pageName: "Sign In",    
    });
});

// POST: handle the signin logic
app.post("/signin",
[
    middleware.isNotLoggedIn,
    signInValidationRules(),
    validateSignin,
    passport.authenticate("local.signin", {
        failureRedirect: "/user/signin",
        failureFlash: true,
    }),
],
function(req, res, next) {
    // Issue a remember me cookie if the option was checked
    if (req.body.remember_me) {
        req.session.cookie.maxAge = 604800000; // 7 days
        return next();
    } else{
        req.session.cookie.expire = false; // cookie expires at end of session
        return next();
    } 
},
async (req, res) => {
    try {        

        // cart logic when the user logs in
        let cart = await Cart.findOne({ user: req.user._id });
        // if there is a cart session and user has no cart, save it to the user's cart in db
        if (req.session.cart && !cart) {
            const cart = await new Cart(req.session.cart);
            cart.user = req.user._id;
            await cart.save();
        }
        // if user has a cart in db, load it to session
        if (cart) {
            req.session.cart = cart;
        }
        // redirect to old URL before signing in
        if (req.session.oldUrl) {
            var oldUrl = req.session.oldUrl;
            req.session.oldUrl = null;
            res.redirect(oldUrl);
        } else {
            res.redirect("/user/profile");
        }
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("/");
    }
});

// GET: display user's profile
app.get("/profile", middleware.isLoggedIn, async (req, res) => {
    const successMsg = await req.consumeFlash("success");
    const errorMsg = await req.consumeFlash("error");
    
    try {
        // find all orders of this user
        allOrders = await Order.find({ user: req.user._id }).populate("user");
        const ordersCount = await Order.countDocuments({ user: req.user._id });

        let itemsQty = 0;
        for(var i = 0; i < allOrders.length; i++){
            itemsQty += allOrders[i].cart.totalQty;
        }
    
        res.render("user/profile", {
            orders: allOrders,
            ordersCount,
            itemsQty,
            csrfToken: req.csrfToken(),
            errorMsg,
            successMsg,
            pageName: "User Profile",
        });
    } catch (err) {
        console.log(err);
        return res.redirect("/");
    }
});

app.get("/editProfile", middleware.isLoggedIn, async (req, res) => {
    const successMsg = await req.consumeFlash("success");
    const errorMsg = await req.consumeFlash("error");
  
    try {
        // find the user
        const user = await User.findById({ _id: req.user._id });
    
        res.render("user/editProfile", {
            user,
            csrfToken: req.csrfToken(),
            errorMsg,
            successMsg,
            pageName: "Edit Profile",
        });
    } catch (err) {
        console.log(err);
        return res.redirect("/");
    }
});

// GET: display the forgot password form with csrf token
app.get("/forgotPassword", (req, res) => {
    const errorMsg = req.consumeFlash("error");  
    res.render("user/forgotPassword", {
        csrfToken: req.csrfToken(),
        errorMsg,
        pageName: "Forgot Password",    
    });
});

// GET: logout
app.get('/logout', middleware.isLoggedIn, (req, res) => {
    req.logout();
    req.session.destroy((err) => res.redirect('/'));
});

// POST: update user
app.post('/updateUser', async (req, res) => {
    const userId = req.body.updateId;
    const username= req.body.name;
    const address= req.body.address;  
  
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

            // move the user image to images folder
            moveFile(userImage, uploadPath);
            
        }else {
            // set userImagePath if image not uploaded
            user.userImagePath = user.userImagePath;            
        }
        user.email = user.email;
        user.password = user.password;        
        user.username = username;        
        user.address = address;

        await user.save(async (err, newUser) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
    
            req.flash("success", "Profile Updated Successfully");
            res.redirect("/user/profile");
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/user/profile");
    }
});

module.exports = app;
