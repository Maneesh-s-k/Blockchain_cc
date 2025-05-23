const router = require("express").Router();
const passport = require("passport");


// Route for successful login
router.get("/login/success", (req, res) => {
    if (req.user) {
        res.status(200).json({
            error: false,
            message: "Successfully Logged In",
            user: req.user,
        });
    } else {
        res.status(403).json({
            error: true,
            message: "Not Authorized",
        });
    }
});

// Route for failed login
router.get("/login/failed", (req, res) => {
    res.status(401).json({
        error: true,
        message: "Login failure",
    });
});

// Route for Google authentication
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

// Google authentication callback route
router.get(
    "/google/callback",
    passport.authenticate("google", {
        successRedirect: "http://localhost:5173/dashboard",
        failureRedirect: "/login/failed",
    })
);

// Local strategy login route
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Login failed" });
            }
			return res.status(200).json({ success: true, message: "Login successful", user });

        });
    })(req, res, next);
});

// Route for logout
// router.get("/logout", (req, res) => {
//     req.session = null; // Clear the session
//     res.clearCookie("session"); // Explicitly clear the cookie

//     console.log("User logged out successfully");
//     return res.status(200).json({ success: true, message: "Logged out successfully" });
// });

router.get("/logout", (req, res) => {

    if (!req.session) {
        return res.status(400).json({ success: false, message: "No active session" });
    }

    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ success: false, message: "Session could not be destroyed" });
        }
        res.clearCookie("connect.sid", { path: "/" }); // Explicitly remove session cookie
        console.log("User logged out successfully");
        return res.status(200).json({ success: true, message: "Logged out successfully" });
    });
});

module.exports = router;


