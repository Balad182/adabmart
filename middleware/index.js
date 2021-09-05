let middlewareObject = {};

//a middleware to check if a user is logged in or not
middlewareObject.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    console.log("AUTHENTICATION!!!");
    res.redirect("/");
};

middlewareObject.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/user/signin");
};

middlewareObject.isAdmin = (req, res, next) => {  
    if(req.user  && req.user.role == 'Admin'){      
        return next();
    }else if(req.user){
        res.redirect("/user/profile");
    }  
    res.redirect("/user/signin");
};

module.exports = middlewareObject;
