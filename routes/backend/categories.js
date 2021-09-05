const express = require("express");
const Category = require("../../models/category");
const middleware = require("../../middleware");

const app = express();

// GET: display all categories
app.get("/", middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {   
    const successMsg = await req.consumeFlash('success');
    const errorMsg = await req.consumeFlash('error');

    try {
        // find all categories
        const categories = await Category.find({});
          
        res.render("backend/categories/index", {
            pageName: "All Categories",
            categories,
            csrfToken: req.csrfToken(),
            successMsg,
            errorMsg,  
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/categories");
    }
});

// POST: create category
app.post("/createCategory", async (req, res) => {  
    const categoryName = req.body.categoryName; 

    try {
        // find if the category exists
        const foundCategory = await Category.findOne({slug: categoryName});
        if(!foundCategory){
            const category = await new Category({
                categoryName: categoryName,
            });
            category.save(async (err, newCategory) => {
                if (err) {
                    console.log(err);
                    return res.redirect("/admin/categories");
                }
                await req.flash("success", "Category Created Successfully");
                res.redirect("/admin/categories");
            })
        }     

    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/categories");
    }
});

// GET: display a category to edit using its slug
app.get('/:slug', middleware.isLoggedIn, middleware.isAdmin, async (req, res) =>{
    const categorySlug = req.params.slug;
    try {
        // find the category to edit
        const category = await Category.findOne({slug: categorySlug});
        if(category){      
            res.render('backend/categories/editCategory', {pageName: 'Edit Category', foundCategory: category, csrfToken: req.csrfToken(),});
        }
    } catch (error) {
        console.log(error);
        res.redirect("/admin/categories");
    }  
    
});

// POST: update a category
app.post('/updateCategory', async (req, res) => {  
    const categoryId = req.body.updateId; 
    const categoryName = req.body.updateName;
  
    try {
        // find and update the category
        Category.findOneAndUpdate({_id: categoryId}, {$set: {categoryName: categoryName}}, async (err, updateCategory) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
            req.flash("success", "Category Updated Successfully");
            res.redirect("/admin/categories");
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/categories");
    }  
});

// POST: delete category
app.post('/deleteCategory', middleware.isLoggedIn, middleware.isAdmin, async (req, res) => {
    const categoryId = req.body.deleteId;
    try {
        // find and delete the category
        Category.findOneAndDelete({_id: categoryId}, async (err, deleteCategory) => {
            if (err) {
                console.log(err);
                return res.redirect(req.headers.referer);
            }
            req.flash("success", "Category Deleted Successfully");
            res.redirect("/admin/categories");
        })
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/admin/categories");
    }
});

module.exports = app;
