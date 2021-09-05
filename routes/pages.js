const express = require("express");
const csrf = require("csurf");
const mailgun = require("mailgun-js");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const md5 = require("md5");
const mailgunDomain = process.env.MAILGUN_DOMAIN;
const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
const mailchimpListId = process.env.MAILCHIMP_LIST_ID;

const {
    contactUsValidationRules,
    validateContactUs,
} = require("../config/validator");

const app = express();

const csrfProtection = csrf();
app.use(csrfProtection);

//GET: display abous us page
app.get("/about-us", (req, res) => {
    res.render("pages/about-us", {
      pageName: "About Us",
    });
});

//GET: display shipping policy page
app.get("/shipping-policy", (req, res) => {
    res.render("pages/shipping-policy", {
        pageName: "Shipping Policy",
    });
});

//GET: display careers page
app.get("/careers", (req, res) => {
    res.render("pages/careers", {
        pageName: "Careers",
    });
});

//GET: display contact us page and form with csrf tokens
app.get("/contact-us", async (req, res) => {
    const successMsg = await req.consumeFlash("success");
    const errorMsg = await req.consumeFlash("error");
    res.render("pages/contact-us", {
        pageName: "Contact Us",
        csrfToken: req.csrfToken(),
        successMsg,
        errorMsg,
    });
});

//POST: handle contact us form logic using nodemailer
app.post("/contact-us",
    [contactUsValidationRules(), validateContactUs],
    async (req, res) => {
        const userEmail = req.body.email;
        const userName = req.body.name;
        const message = req.body.message;

        try{
            // instantiate the mailgun API
            const mg = await mailgun({apiKey: mailgunApiKey, domain: mailgunDomain});

            // email data
            const data = {
                from: `Excited User <${userEmail}>`,
                to: process.env.ADMIN_EMAIL,
                subject: `Enquiry from ${userName}`,
                html: `
                    <div>
                        <h2 style="color: #478ba2; text-align:center;">Customer's name: ${userName}</h2>
                        <h3 style="color: #478ba2;">Customer's email: ${userEmail}<h3>
                    </div>
                    <h3 style="color: #478ba2;">Customer's message: </h3>
                    <div style="font-size: 30;">
                      ${message}
                    </div>
                    `,
            };

            // send the email
            await mg.messages().send(data, (error, body) => {
                if (error) {
                    req.flash("error",
                    "An error occured... Please check your internet connection and try again later"
                    );
                    return res.redirect("/pages/contact-us");
                } else {        
                    req.flash("success",
                    "Email sent successfully! Thanks for your inquiry."
                    );
                    return res.redirect("/pages/contact-us");
                }
            });    
        }catch (err) {
            console.log(err);
        }
    }
);

app.post('/newsletter', async (req, res) => {
    const email = req.body.email;  
    const subscriberHash = md5(email.toLowerCase());  

    try{
        await mailchimp.setConfig({
            apiKey: mailchimpApiKey,
            server: mailchimpServerPrefix,
        });

        const response = await mailchimp.lists.setListMember(
            mailchimpListId,
            subscriberHash,
            { email_address: email, status_if_new: "subscribed" }
        );
        if(response.status == 'subscribed'){
            req.flash("success",
            "Email subscribed successfully! Thanks for your interest."
            );
            return res.redirect("/");
        }else{
            req.flash("error",
            "Email already exist, try another one."
            );
            return res.redirect("/");
        }

    } catch (err) {      
        req.flash("error",
        "Email can not be subscribed, try another one."
        );
        return res.redirect("/");
    }   
    
});

module.exports = app;
