const express = require("express");
const Product = require("../models/product");
const Category = require("../models/category");
var moment = require("moment");

const app = express();

// GET: display all products
app.get("/", async (req, res) => {
  	const successMsg = await req.consumeFlash("success");
  	const errorMsg = await req.consumeFlash("error");
  	const perPage = 8;
  	let page = parseInt(req.query.page) || 1;
  
  	try {
		const products = await Product.find({})
	  	.sort("-createdAt")
	  	.skip(perPage * page - perPage)
	  	.limit(perPage)
	  	.populate("productCategory");

		const count = await Product.countDocuments();

		res.render("shop/index", {
	  		pageName: "All Products",
	  		products,
	  		successMsg,
	  		errorMsg,
	  		current: page,	  		
	  		home: "/products/?",
	  		pages: Math.ceil(count / perPage),
		});
  	} catch (error) {
		console.log(error);
		res.redirect("/");
  	}
});

// GET: search box
app.get("/search", async (req, res) => {
  	const perPage = 8;
  	let page = parseInt(req.query.page) || 1;
  	const successMsg = await req.consumeFlash("success");
  	const errorMsg = await req.consumeFlash("error");

  	try {
		const products = await Product.find({
	  		productName: { $regex: req.query.search, $options: "i" },
		})
	  	.sort("-createdAt")
	  	.skip(perPage * page - perPage)
	  	.limit(perPage)
	  	.populate("productCategory")
	  	.exec();
		const count = await Product.countDocuments({
	  		productName: { $regex: req.query.search, $options: "i" },
		});
		res.render("shop/index", {
	  		pageName: "Search Results",
	  		products,
	  		successMsg,
	  		errorMsg,
	  		current: page,	  
	  		home: "/products/search?search=" + req.query.search + "&",
	  		pages: Math.ceil(count / perPage),
		});
  	} catch (error) {
		console.log(error);
		res.redirect("/");
  	}
});

//GET: get a certain category by its slug (this is used for the categories navbar)
app.get("/:slug", async (req, res) => {
  	const successMsg = await req.consumeFlash("success");
  	const errorMsg = await req.consumeFlash("error");
  	const perPage = 8;
  	let page = parseInt(req.query.page) || 1;
  	
  	try {
		const foundCategory = await Category.findOne({slug: req.params.slug});
		const allProducts = await Product.find({ productCategory: foundCategory.id })
	  	.sort("-createdAt")
	  	.skip(perPage * page - perPage)
	  	.limit(perPage)
	  	.populate("category");

		const count = await Product.countDocuments({ productCategory: foundCategory.id });

		res.render("shop/index", {
	  		pageName: foundCategory.categoryName,
	  		currentCategory: foundCategory,
	  		products: allProducts,
	  		successMsg,
	  		errorMsg,
	  		current: page,	  		
	  		home: "/products/" + req.params.slug.toString() + "/?",
	  		pages: Math.ceil(count / perPage),
		});
  	} catch (error) {
		console.log(error);
		return res.redirect("/");
  	}
});

// GET: display a certain product by its id
app.get("/:productName/:id", async (req, res) => {
  	const successMsg = await req.consumeFlash("success");
  	const errorMsg = await req.consumeFlash("error");
  	
  	try {
		const product = await Product.findById(req.params.id).populate("category");
		res.render("shop/product", {
	  		pageName: product.productName,
	  		product,
	  		successMsg,
	  		errorMsg,
	  		moment: moment,
		});
  	} catch (error) {
		console.log(error);
		return res.redirect("/");
  	}
});

module.exports = app;
