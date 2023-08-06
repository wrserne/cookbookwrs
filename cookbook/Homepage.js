const express = require('express');
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const app = express();
const session = require('express-session');

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// MySQL Connection
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'password',
    database: 'cookbook', // Specify the cookbook database
    insecureAuth: true
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the database!');
});

// Set up Express.js
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

// Middleware function to check if the user is authenticated
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        // User is authenticated, continue to the next middleware or route handler
        next();
    } else {
        // User is not authenticated, redirect to the login page
        res.redirect('/login');
    }
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images'); // Choose a directory to save the uploaded images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Homepage - Display multiple carousels for different recipe categories
app.get('/', (req, res) => {
    // Retrieve all recipes from the database
    const sql = 'SELECT * FROM recipes';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error retrieving recipes: ' + err.stack);
            res.status(500).send('Error retrieving recipes.');
            return;
        }

        // Process the ingredients and instructions to create arrays
        results.forEach(recipe => {
            recipe.ingredients = recipe.ingredients.split('|');
            recipe.instructions = recipe.instructions.split('|');
        });

        // Group recipes based on their type (category)
        const categories = [
            'Appetizer', 'Breads', 'Soups', 'Pasta & Sauces',
            'Entrées', 'Veggies', 'Cakes', 'Pies', 'Cookies'
        ];
        const categorizedRecipes = {};
        categories.forEach(category => {
            categorizedRecipes[category] = results.filter(recipe => recipe.type === category);
        });

        // Show or hide the "Add Recipe" and "My Recipes" links based on authentication
        const showAddRecipeLink = req.session.authenticated;
        const showMyRecipesLink = req.session.authenticated;

        res.render('home', {
            categories,
            categorizedRecipes,
            authenticated: req.session.authenticated,
            userId: req.session.userId,
            showAddRecipeLink,
            showMyRecipesLink
        });
    });
});

// User Registration - Display the registration form
app.get('/register', (req, res) => {
    res.render('register', { errorMessage: req.session.errorMessage });
    req.session.errorMessage = undefined; // Clear the error message after displaying it
});

// User Registration - Form Submission
app.post('/register', (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    console.log('Received registration request for:', email, password, firstName, lastName);

    // Check if the email already exists in the database
    const emailCheckSql = 'SELECT * FROM cookbook.users WHERE email = ?';
    connection.query(emailCheckSql, [email], (emailErr, emailResults) => {
        if (emailErr) {
            console.error('Error checking email: ' + emailErr.stack);
            res.status(500).send('Error checking email.');
            return;
        }

        if (emailResults.length > 0) {
            // Email already exists, send an error message
            req.session.errorMessage = 'Email already registered.';
            res.redirect('/register');
            return;
        }

        // Insert new user into the 'cookbook.users' table
        const insertSql = 'INSERT INTO cookbook.users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)';
        connection.query(insertSql, [email, password, firstName, lastName], (insertErr, result) => {
            if (insertErr) {
                console.error('Error registering user: ' + insertErr.stack);
                res.status(500).send('Error registering user.');
                return;
            }
            console.log('User registered successfully!');

            // Set the session variables for authenticated user
            req.session.authenticated = true;
            req.session.userId = result.insertId;

            // Redirect to the homepage after registration
            res.redirect('/');
        });
    });
});

// Login - Display the login form
app.get('/login', (req, res) => {
    res.render('login', { errorMessage: req.session.errorMessage });
    req.session.errorMessage = undefined; // Clear the error message after displaying it
});

// Login - Form Submission
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Check if the email and password match a user in the database
    const sql = 'SELECT * FROM cookbook.users WHERE email = ? AND password = ?';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Error logging in: ' + err.stack);
            res.status(500).send('Error logging in.');
            return;
        }

        if (results.length > 0) {
            // Set the session variables for authenticated user
            req.session.authenticated = true;
            req.session.userId = results[0].id;

            // Redirect to the homepage after successful login
            res.redirect('/');
        } else {
            // Set an error message in the session
            req.session.errorMessage = 'Invalid email or password';
            // Redirect to the login page
            res.redirect('/login');
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session: ' + err.stack);
            res.status(500).send('Error logging out.');
            return;
        }

        // Redirect to the homepage after successful logout
        res.redirect('/');
    });
});

// Add Recipe - Display the form for adding a new recipe (require authentication)
app.get('/addRecipe', requireAuth, (req, res) => {
    res.render('addRecipe', { authenticated: req.session.authenticated });
});

// Add Recipe - Form Submission
app.post('/addRecipe', requireAuth, upload.single('photo'), (req, res) => {
    const { title, ingredients, instructions, familySecrets, type } = req.body;
    const image_url = req.file ? req.file.filename : null;
    const userId = req.session.userId; // Get the userId from the session

    // Insert the new recipe into the database with the associated userId
    const sql = 'INSERT INTO recipes (title, ingredients, instructions, family_secrets, type, image_url, userId) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [title, ingredients, instructions, familySecrets, type, image_url, userId], (err, result) => {
        if (err) {
            console.error('Error adding recipe: ' + err.stack);
            res.status(500).send('Error adding recipe.');
            return;
        }
        console.log('Recipe added successfully!');

        // Redirect to the homepage or show a success message
        res.redirect('/');
    });
});

// Retrieve recipes associated with the user from the database
app.get('/myRecipes', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = 'SELECT * FROM recipes WHERE userId = ?';
    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error retrieving recipes: ' + err.stack);
            res.status(500).send('Error retrieving recipes.');
            return;
        }
        
        res.render('myRecipes', { recipes: results });
    });
});
app.get('/editRecipe/:recipeId', requireAuth, (req, res) => {
    const recipeId = req.params.recipeId;
    const userId = req.session.userId;

    // Fetch the recipe from the database
    const sql = 'SELECT * FROM recipes WHERE id = ? AND userId = ?';
    connection.query(sql, [recipeId, userId], (err, results) => {
        if (err) {
            console.error('Error retrieving recipe: ' + err.stack);
            res.status(500).send('Error retrieving recipe.');
            return;
        }

        if (results.length === 0) {
            // Recipe not found or not associated with the user
            res.status(404).send('Recipe not found.');
            return;
        }

        const recipe = results[0];
        res.render('editRecipe', { recipe });
    });
});
app.post('/updateRecipe/:recipeId', requireAuth, (req, res) => {
    const recipeId = req.params.recipeId;
    const userId = req.session.userId;

    // Update the recipe in the database
    const { title, ingredients, instructions, familySecrets, type } = req.body;
    const sql = 'UPDATE recipes SET title = ?, ingredients = ?, instructions = ?, family_secrets = ?, type = ? WHERE id = ? AND userId = ?';
    connection.query(sql, [title, ingredients, instructions, familySecrets, type, recipeId, userId], (err, result) => {
        if (err) {
            console.error('Error updating recipe: ' + err.stack);
            res.status(500).send('Error updating recipe.');
            return;
        }
        console.log('Recipe updated successfully!');

        // Redirect back to the My Recipes page or show a success message
        res.redirect('/myRecipes');
    });
});
// ... (Other routes and setup)

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
