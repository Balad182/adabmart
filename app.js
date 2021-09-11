require("dotenv").config();
const createError = require("http-errors");
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { flash } = require('express-flash-message');
const ejs = require('ejs');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const MongoStore = require("connect-mongo");
const connectDB = require("./config/db");
const Category = require("./models/category");
const middleware = require("./middleware");

const app = express();
require("./config/passport");
// mongodb configuration
connectDB();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create( {   
      mongoUrl: process.env.MONGO_URI || process.env.LOCAL_URI,
    }),
    // session expires after 4 hours
    cookie: {
      maxAge: 1000 * 60 * 60 * 4,      
    },
  })
);

// apply express-flash-message middleware
app.use(flash({ sessionKeyName: 'flashMessage' }));
// app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// app.use(passport.authenticate('remember-me'));

// global variables across routes
app.use(async (req, res, next) => {
    try {
        res.locals.login = req.isAuthenticated();
        res.locals.session = req.session;
        res.locals.currentUser = req.user;
        const categories = await Category.find({}).sort({ title: 1 }).exec();
        res.locals.categories = categories;
        next();
    } catch (error) {
        console.log(error);
        res.redirect("/");
    }
});

//routes config
const indexRouter = require("./routes/index");
const productsRouter = require("./routes/products");
const usersRouter = require("./routes/user");
const pagesRouter = require("./routes/pages");
const adminIndexRouter = require("./routes/backend/index");
const adminCategoriesRouter = require("./routes/backend/categories");
const adminOrdersRouter = require("./routes/backend/orders");
const adminUsersRouter = require("./routes/backend/users");
const adminProductsRouter = require("./routes/backend/products");
app.use("/products", productsRouter);
app.use("/user", usersRouter);
app.use("/pages", pagesRouter);
app.use("/", indexRouter);
app.use("/admin", adminIndexRouter);
app.use("/admin/categories", adminCategoriesRouter);
app.use("/admin/orders", adminOrdersRouter);
app.use("/admin/products", adminProductsRouter);
app.use("/admin/users", adminUsersRouter);

//catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

var port = process.env.PORT || 3000;
app.set("port", port);
app.listen(port, () => {
    console.log("Server running at port " + port);
});
