const express = require("express");
const { customAlphabet } = require('nanoid');
const Product = require("../../models/product");
const Category = require("../../models/category");
const middleware = require("../../middleware");
const moment = require("moment");
const fs = require('fs-extra');
const path = require('path');
const uploadsFolder = path.join(__dirname, '..', '..', 'public');  // defining real upload path

const nanoid = customAlphabet('1234567890', 6);
const {accessFile, moveFile,} = require("../../config/validator");

const app = express();

// GET: display all products
app.get("/", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const successMsg = await req.consumeFlash('success');
    const errorMsg = await req.consumeFlash('error');
    const perPage = 8;
    let page = parseInt(req.query.page) || 1;
    
    try {
        const products = await Product.find({})
        .sort("-createdAt")
        .skip(perPage * page - perPage)
        .limit(perPage)
        .populate("productCategory");      

        const count = await Product.countDocuments();

        res.render("backend/products", {
            pageName: "All Products",
            products,
            successMsg,
            errorMsg,
            csrfToken: req.csrfToken(),
            current: page,      
            home: "/admin/products/?",
            pages: Math.ceil(count / perPage),
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin");
    }
});

// GET: search box
app.get("/search", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const perPage = 10;  
    let page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * perPage;
    const successMsg = req.consumeFlash("success");
    const errorMsg = req.consumeFlash("error");

    try {
        const products = await Product.find({
            productName: { $regex: req.query.search, $options: "i" },
        })
        .sort("-createdAt")
        .skip(skip)
        .limit(perPage)
        .populate("category")
        .exec();
        const count = await Product.countDocuments({
            productName: { $regex: req.query.search, $options: "i" },
        });
        res.render("backend/products", {
            pageName: "Search Results",
            products,
            successMsg,
            errorMsg,
            current: page,
            breadcrumbs: null,
            home: "/admin/products/search?search=" + req.query.search + "&",
            pages: Math.ceil(count / perPage),
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin");
    }
});


// GET: create a products
app.get("/createProduct", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {  
    try {
        const categories = await Category.find({});    

        res.render("backend/products/createProduct", {     
            categories,
            pageName: 'Create Product',
            csrfToken: req.csrfToken(),      
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/products");
    }
});
  

// POST: create product
app.post("/createProduct", async (req, res) => {  
    const productName = req.body.productName;
    const productImage = req.files.productImage;
    const productDescription = req.body.productDescription;
    const productPrice = req.body.productPrice;
    const productCategoryId = req.body.productCategoryId;
    const productManufacturer = req.body.productManufacturer;
    const productQuantity = req.body.productQuantity;
    const imageName = (productImage.name).replace(/ /g, '_');
    const uploadPath = uploadsFolder + '/images/' + imageName;
    const imagePath = '/images/'+ imageName;

    try {
        // move the new product image to images folder
        moveFile(productImage, uploadPath);        

        const productCategory = await Category.findOne({_id: productCategoryId});
        if(productCategory){
            const product = await new Product({
                productCode: await nanoid(),
                productName: productName,
                productImagePath: imagePath,
                productDescription: productDescription,
                productPrice: productPrice,
                productCategory: productCategory,
                productManufacturer: productManufacturer,
                productQuantity: productQuantity
            });
            product.save(async (err, newProduct) => {
                if (err) {
                    console.log(err);
                    return res.redirect("admin/products");
                }
                req.flash("success", "Product Created Successfully");
                res.redirect("/admin/products");
            })
        }     
    
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/products");
    }
});


// GET: display a product to edit by its id
app.get('/:productName/:productId', middleware.isLoggedIn, middleware.isAdmin, async (req, res) =>{
    const productId = req.params.productId;
    try {
        const product = await Product.findById(productId).populate("productCategory");
        const categories = await Category.find({});

        if(product){      
            res.render('backend/products/editProduct', {pageName:'Edit Product', product, categories, csrfToken: req.csrfToken(),});
        }
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/products");
    }  
});


// POST: update product
app.post('/updateProduct', async (req, res) => {
  
    const productId = req.body.updateId;
    const productCode = req.body.productCode;
    const productName = req.body.productName;  
    const productDescription = req.body.productDescription;
    const productPrice = req.body.productPrice;
    const productCategoryId = req.body.productCategoryId;
    const productManufacturer = req.body.productManufacturer;
    const productQuantity = req.body.productQuantity;
  
    try {
        const productCategory = await Category.findById(productCategoryId);
        const product = await Product.findById(productId);

        // check if image is uploaded or not
        if(req.files){
            const productImage = req.files.productImage;

            const imageName = (productImage.name).replace(/ /g, '_');
            const uploadPath = uploadsFolder + '/images/' + imageName;
            const imagePath = '/images/'+ imageName;

            // remove the previous image from the images folder
            const productImagePath = product.productImagePath;
            if(productImagePath){
                const filePath = uploadsFolder + productImagePath;

                accessFile(filePath);
            }

            // set the produb=ctImagePath with the new imagePath
            product.productImagePath = imagePath;

            // move the updated product image to images folder
            await moveFile(productImage, uploadPath) ;
    
        }else {
            // set productImagePath if image not uploaded
            product.productImagePath = product.productImagePath;            
        }
    
        product.productCode= productCode;
        product.productName= productName;      
        product.productDescription= productDescription;
        product.productPrice= productPrice;
        product.productCategory= productCategory;
        product.productManufacturer= productManufacturer;
        product.productQuantity= productQuantity;   
   
        await product.save((err, updatedProduct) => {
            if(err){
                console.log(err);
                return res.redirect(req.headers.referer);
            }
            req.flash("success", "Product Updated Successfully");
            res.r
            edirect("/admin/products");
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/products");
    }
});


// GET: delete a product
app.get('/:productId', middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const deleteId = req.params.productId;

    const foundProduct = await Product.findById(deleteId);
    const productImagePath = foundProduct.productImagePath;

    try {
        const filePath = uploadsFolder + productImagePath;

        accessFile(filePath);

        Product.findByIdAndDelete(deleteId, async (err, deleteProduct) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
        
            req.flash("success", "Product Deleted Successfully");
            res.redirect("/admin/products");
        })
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/products");
    }
  
});

//GET: get products under certain category by its slug
app.get("/:slug", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const successMsg = req.consumeFlash("success");
    const errorMsg = req.consumeFlash("error");
    const perPage = 8;
    let page = parseInt(req.query.page) || 1;
    
    try {
        const foundCategory = await Category.findOne({ slug: req.params.slug });
        const allProducts = await Product.find({ category: foundCategory.id })
        .sort("-createdAt")
        .skip(perPage * page - perPage)
        .limit(perPage)
        .populate("category");

        const count = await Product.count({ category: foundCategory.id });

        res.render("/backend/products/index", {
            pageName: foundCategory.title,
            currentCategory: foundCategory,
            products: allProducts,
            successMsg,
            errorMsg,
            current: page,                
            home: "/products/" + req.params.slug.toString() + "/?",
            pages: Math.ceil(count / perPage),
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("/");
    }
});

module.exports = app;
