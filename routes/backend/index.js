const express = require("express");
const csrf = require("csurf");
const Product = require("../../models/product");
const Category = require("../../models/category");
const Cart = require("../../models/cart");
const Order = require("../../models/order");
const User = require("../../models/user");
const middleware = require("../../middleware");
const moment = require("moment");

const app = express();
const csrfProtection = csrf();
app.use(csrfProtection);

// GET: home page
app.get("/", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const perPage = 10;  
    let page = parseInt(req.query.page) || 1;
  
    try {
        const products = await Product.find({}).sort("-createdAt").populate("category");
        const categories = await Category.find({});
        const orders = await Order.find({}).sort("-createdAt").populate("cart").populate("user");
        const users = await User.find({}).sort("-createdAt");
        const productsCount = await Product.countDocuments();
        const categoriesCount = await Category.countDocuments();
        const ordersCount = await Order.countDocuments();
        const usersCount = await User.countDocuments();
      
        res.render("backend/home", { 
            pageName: "Admin", 
            products, productsCount, 
            categories, categoriesCount, 
            orders, ordersCount, 
            users, usersCount,
            moment: moment,
            current: page,      
            home: "/admin/orders/?",
            pages: Math.ceil(ordersCount / perPage)
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/");
    }
});

module.exports = app;
