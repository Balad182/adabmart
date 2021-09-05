const { check, validationResult } = require("express-validator");
const fs = require('fs-extra');

const signUpValidationRules = () => {
    return [
        check("name", "Name is required").not().isEmpty(),
        check("email", "Invalid email").not().isEmpty().isEmail(),
        check("password", "password must be 5 or more characters long and contain a number")
        .not()
        .isEmpty()
        .isLength({ min: 5 })
        .matches(/\d/),
    ];
};

const signInValidationRules = () => {
    return [
        check("email", "Invalid email").not().isEmpty().isEmail(),
        check("password", "Invalid password").not().isEmpty().isLength({ min: 5 }).matches(/\d/),
    ];
};

const contactUsValidationRules = () => {
    return [
        check("name", "Please enter a name").not().isEmpty(),
        check("email", "Please enter a valid email address")
        .not()
        .isEmpty()
        .isEmail(),
        check("message", "Please enter a message with at least 10 words")
        .not()
        .isEmpty()
        .isLength({ min: 10 }),
    ];
};

const validateSignup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var messages = [];
        errors.array().forEach((error) => {
        messages.push(error.msg);
    });
    req.flash("error", messages);
    //return res.redirect("/user/signup");
  }
  next();
};

const validateSignin = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var messages = [];
        errors.array().forEach((error) => {
            messages.push(error.msg);
        });
        req.flash("error", messages);
        console.log(messages);
        return res.redirect("/user/signin");
    }
    next();
};

const validateContactUs = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var messages = [];
        errors.array().forEach((error) => {
            messages.push(error.msg);
        });   
        req.flash("error", messages);
        return res.redirect("/pages/contact-us");
    }
    next();
};

const accessFile = (filePath) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if(!err){
            fs.unlink(filePath, (err)=>{
                if (err) {
                    console.error(err)            
                }
            });
        }
    });
};

const moveFile = (fileName, filePath) => {
    fileName.mv(filePath, (err) => {        
        if (err) {
            console.log(err);
            return res.redirect(req.headers.referer);
        }
    });
};

module.exports = {
    signUpValidationRules,
    signInValidationRules,
    contactUsValidationRules,
    validateSignup,
    validateSignin,
    validateContactUs,
    accessFile,
    moveFile,
};
