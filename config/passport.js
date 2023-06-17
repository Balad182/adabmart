const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user");
const bcrypt = require('bcrypt');
const saltRounds = 10;

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser((id, cb) => {
     User.findById(id, (err, user) => {
        if (err) { return cb(err); }
        cb(err, user);
    });
});

passport.use("local.signup",
    new LocalStrategy(
    {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true,
    },
    async (req, email, password, cb) => {
        try {
            const user = await User.findOne({ email: email });
            if (user) {
                return cb(null, false, { message: "Email already exists" });
            }
            if (password != req.body.password2) {
                return cb(null, false, { message: "Passwords must match" });
            }

            const newUser = await new User();  
        
            newUser.email = email;
            newUser.username = req.body.name;
            newUser.password = newUser.encryptPassword(password);        
            await newUser.save();
            return cb(null, newUser);
        } catch (error) {
            console.log(error);
            return cb(error);
        }
    })
);

passport.use("local.signin",
    new LocalStrategy(
    {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: false,
    },
    async (email, password, cb) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return cb(null, false, { message: "User doesn't exist" });
            }

            if (!user.comparePassword(password)) {
                return cb(null, false, { message: "Wrong password" });
            }
            return cb(null, user);
        } catch (error) {
            console.log(error);
            return cb(error);
        }
    })
);
