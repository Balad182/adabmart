const express = require("express");
const Product = require("../../models/product");
const Cart = require("../../models/cart");
const Order = require("../../models/order");
const User = require("../../models/user");
const middleware = require("../../middleware");
var moment = require("moment");

const app = express();

// GET: display all orders
app.get("/", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
  const successMsg = await req.consumeFlash('success');
  const errorMsg = await req.consumeFlash('error');
  const perPage = 8;
  let page = parseInt(req.query.page) || 1;
  try {
    const orders = await Order.find({})
      .sort("-createdAt")
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("user");

    const count = await Order.countDocuments();

    res.render("backend/orders", {
      pageName: "All Orders",
      orders,
      successMsg,
      errorMsg,
      csrfToken: req.csrfToken(),
      current: page, 
      moment: moment,     
      home: "/admin/orders/?",
      pages: Math.ceil(count / perPage),
    });
  } catch (err) {
    console.log(err);
    req.flash("error", err.message);
    res.redirect("/");
  }
});



// GET: search box
app.get("/search/:orderNumber", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const orderNumber = req.params.orderNumber;
    const successMsg = req.consumeFlash("success");
    const errorMsg = req.consumeFlash("error");

    try {
        const order = await Order.findOne({
            orderNumber: orderNumber,
        })      
        .populate("user")      
        .exec();

        res.render("backend/order", {
            pageName: "Order Result",
            order,
            successMsg,
            errorMsg,      
            home: "/order/search?search=" + req.query.search + "&",      
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/");
    }
});

// POST: delete an order
app.get('/:deleteId', middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const orderId = req.params.deleteId;

    try {
        Order.findByIdAndDelete(orderId, async (err, deleteOrder) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
        
            req.flash("success", "Order Deleted Successfully");
            res.redirect("/");
        })
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/");
    }
});

module.exports = app;
