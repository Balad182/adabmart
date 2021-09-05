const express = require("express");
const csrf = require("csurf");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Product = require("../models/product");
const User = require("../models/user");
const Category = require("../models/category");
const Cart = require("../models/cart");
const Order = require("../models/order");
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('1234567890', 6);
const middleware = require("../middleware");
const fs = require('fs-extra');
const path = require('path');
const dirPath = path.join(__dirname, '..', 'public/images/');
const app = express();
const csrfProtection = csrf();
app.use(csrfProtection);

// GET: home page
app.get("/", async (req, res) => {
    const successMsg = await req.consumeFlash("success");
    const errorMsg = await req.consumeFlash("error");
    
    try {
        const filename = 'slide';
        const fileType = '.jpg'; //file extension
        const slideImgs = [];
        await fs.readdir(dirPath, function(err,list){
            if(err) throw err;
            for(var i=0; i<list.length; i++){
      
                /*user your conditions AND/OR */
                if(path.extname(list[i])===fileType && list[i].indexOf(filename) != -1){             
                    slideImgs.push(list[i]); //store the file name into the array files
                }
            } 
        });

        const products = await Product.find({})
        .sort("-createdAt")
        .populate("productCategory");      
        res.render("shop/home", { pageName: "Home", slideImgs, products, csrfToken: req.csrfToken(), successMsg, errorMsg});
    } catch (error) {
        console.log(error);
        res.redirect("/");
    }
});

// GET: add a product to the shopping cart when "Add to cart" button is pressed
app.get("/add-to-cart/:id", async (req, res) => {
    const productId = req.params.id;
    
    try {
        // get the correct cart, either from the db, session, or an empty cart.
        let user_cart;
        if (req.user) {
            user_cart = await Cart.findOne({ user: req.user._id });
        }
        let cart;
        if ((req.user && !user_cart && req.session.cart) || (!req.user && req.session.cart)) {
            cart = await new Cart(req.session.cart);
        } else if (!req.user || !user_cart) {
            cart = new Cart({});
        } else {
            cart = user_cart;
        }

        // add the product to the cart
        const product = await Product.findById(productId);
        const itemIndex = cart.items.findIndex((p) => p.productId == productId);
        if (itemIndex > -1) {
            // if product exists in the cart, update the quantity
            cart.items[itemIndex].qty++;
            cart.items[itemIndex].price = cart.items[itemIndex].qty * product.productPrice;
            cart.totalQty++;
            cart.totalCost += product.productPrice;
        } else {
            // if product does not exists in cart, find it in the db to retrieve its price and add new item
            cart.items.push({
                productId: productId,
                qty: 1,
                price: product.productPrice,
                title: product.productName,
                productCode: product.productCode,
            });
            cart.totalQty++;
            cart.totalCost += product.productPrice;
        }

        // if the user is logged in, store the user's id and save cart to the db
        if (req.user) {
            cart.user = req.user._id;
            await cart.save();
        }
        req.session.cart = cart;
        req.flash("success", "Item added to the shopping cart");
        res.redirect(req.headers.referer);
    } catch (err) {
        console.log(err.message);
        res.redirect("/");
    }
});

// GET: view shopping cart contents
app.get("/shopping-cart", async (req, res) => {
    try {
        // find the cart, whether in session or in db based on the user state
        let cart_user;
        if (req.user) {
            cart_user = await Cart.findOne({ user: req.user._id });
        }
        // if user is signed in and has cart, load user's cart from the db
        if (req.user && cart_user) {
            req.session.cart = cart_user;
            return res.render("shop/shopping-cart", {
                cart: cart_user,
                pageName: "Shopping Cart",
                products: await productsFromCart(cart_user),
            });
        }
        // if there is no cart in session and user is not logged in, cart is empty
        if (!req.session.cart) {
            return res.render("shop/shopping-cart", {
                cart: null,
                pageName: "Shopping Cart",
                products: null,
            });
        }
        // otherwise, load the session's cart
        return res.render("shop/shopping-cart", {
            cart: req.session.cart,
            pageName: "Shopping Cart",
            products: await productsFromCart(req.session.cart),
        });
    } catch (err) {
        console.log(err.message);
        res.redirect("/");
    }
});

// GET: reduce one from an item in the shopping cart
app.get("/reduce/:id", async function (req, res, next) {
    // if a user is logged in, reduce from the user's cart and save
    // else reduce from the session's cart
    const productId = req.params.id;
    let cart;
    
    try {
        if (req.user) {
            cart = await Cart.findOne({ user: req.user._id });
        } else if (req.session.cart) {
            cart = await new Cart(req.session.cart);
        }

        // find the item with productId
        let itemIndex = cart.items.findIndex((p) => p.productId == productId);
        if (itemIndex > -1) {
            // find the product to find its price
            const product = await Product.findById(productId);
            
            // if product is found, reduce its qty
            cart.items[itemIndex].qty--;
            cart.items[itemIndex].price -= product.productPrice;
            cart.totalQty--;
            cart.totalCost -= product.productPrice;
            
            // if the item's qty reaches 0, remove it from the cart
            if (cart.items[itemIndex].qty <= 0) {
                await cart.items.remove({ _id: cart.items[itemIndex]._id });
            }
            req.session.cart = cart;
            //save the cart it only if user is logged in
            if (req.user) {
                await cart.save();
            }
            
            //delete cart if qty is 0
            if (cart.totalQty <= 0) {
                req.session.cart = null;
                await Cart.findByIdAndRemove(cart._id);
            }
        }
        res.redirect(req.headers.referer);
    } catch (err) {
        console.log(err.message);
        res.redirect("/");
    }
});

// GET: remove all instances of a single product from the cart
app.get("/removeAll/:id", async function (req, res, next) {
    const productId = req.params.id;
    let cart;
    
    try {
        if (req.user) {
            cart = await Cart.findOne({ user: req.user._id });
        } else if (req.session.cart) {
            cart = await new Cart(req.session.cart);
        }
        
        //fnd the item with productId
        let itemIndex = cart.items.findIndex((p) => p.productId == productId);
        if (itemIndex > -1) {
            
            //find the product to find its price
            cart.totalQty -= cart.items[itemIndex].qty;
            cart.totalCost -= cart.items[itemIndex].price;
            await cart.items.remove({ _id: cart.items[itemIndex]._id });
        }
        req.session.cart = cart;
        //save the cart it only if user is logged in
        if (req.user) {
            await cart.save();
        }
        //delete cart if qty is 0
        if (cart.totalQty <= 0) {
            req.session.cart = null;
            await Cart.findByIdAndRemove(cart._id);
        }
        res.redirect(req.headers.referer);
    } catch (err) {
        console.log(err.message);
        res.redirect("/");
    }
});

// GET: checkout form with csrf token
app.get("/checkout", middleware.isLoggedIn, async (req, res) => {
    const errorMsg = req.consumeFlash("error");

    if (!req.session.cart) {
        return res.redirect("/shopping-cart");
    }
    //load the cart with the session's cart's id from the db
    cart = await Cart.findById(req.session.cart._id);
  
    res.render("shop/checkout", {
        total: cart.totalCost,
        csrfToken: req.csrfToken(),
        errorMsg,
        pageName: "Checkout",
    });
});

// POST: handle checkout logic and payment using Stripe
app.post("/checkout", middleware.isLoggedIn, async (req, res) => {  
    const address = req.body.address;
    const source = req.body.stripeToken;

    if (!req.session.cart) {
        return res.redirect("/shopping-cart");
    }
    const cart = await Cart.findById(req.session.cart._id);
    stripe.charges.create(
    {
        amount: cart.totalCost * 100,
        currency: "aed",
        source,
        description: "Test charge",
    },
    async (err, charge) => {
        if (err) {
            req.flash("error", err.message);
            console.log(err);
            return res.redirect("/checkout");
        }      
        const order = new Order({
            orderNumber: await nanoid(),
            user: req.user,
            cart: {
                totalQty: cart.totalQty,
                totalCost: cart.totalCost,
                items: cart.items,
            },
            address: address,
            paymentId: charge.id,
        });
        order.save(async (err, newOrder) => {
            if (err) {
                console.log(err);
                return res.redirect("/checkout");
            }
            await cart.save();

            // subtract the sold quantity from the products in database
            await cart.items.forEach(async (item)=>{
                const itemId = item.productId;          
                const itemQty = item.qty;
                const product = await Product.findById(itemId);          
                product.productQuantity = (product.productQuantity)-=itemQty;
                if(product.productQuantity <= 0){
                    product.available = false;
                }
                await product.save((err, updatedProduct) => {
                    if(err){
                        console.log(err);          
                    }
                });
            })
            await Cart.findByIdAndDelete(cart._id);
            const user = await User.findById(req.user._id);
            if(!user.address){
                await User.findByIdAndUpdate(user._id, {$set: {address: address}});
            }
            req.flash("success", "Successfully purchased");
            req.session.cart = null;
            res.redirect("/user/profile");
        });
    }
  );
});

// create products array to store the info of each product in the cart
async function productsFromCart(cart) {
    let products = []; // array of objects
    for (const item of cart.items) {
        let foundProduct = (
            await Product.findById(item.productId).populate("category")
        ).toObject();
        foundProduct["qty"] = item.qty;
        foundProduct["totalPrice"] = item.price;
        products.push(foundProduct);
    }
    return products;
}

module.exports = app;
