# Family Cookbook Project

This is the repository for the Family Cookbook project. The project aims to create a web application where Donina family users can share and view recipes. Users can register, log in, and contribute their own recipes.

## Features

- User Registration and Login
- Recipe Sharing
- Displaying Recipes
- View Recipes by Category
- Search all recipes
- edit uploaded recipes
- upload photo with recipe
-receive alerts when new recipes are added

## Installation

1. Clone this repository to your local machine.
2. Make sure you have Node.js and MySQL installed.
3. Set up your MySQL database with the appropriate configurations.
4. Update the database configurations in `app.js` to match your MySQL setup.
5. Install project dependencies by running `npm install` in the project directory.
6. Start the server with `node Homepage.js'

## Database Schema

The database schema consists of two main tables: Users and Recipes.

### Users Table

- id (Primary Key, Auto-increment)
- first_name (VARCHAR)
- last_name (VARCHAR)
- email (VARCHAR)
- password (VARCHAR)

### Recipes Table

- id (Primary Key, Auto-increment)
- title (VARCHAR)
- ingredients (TEXT)
- instructions (TEXT)
- photo (VARCHAR)
- makes (INTEGER)
- user_id (Foreign Key, References Users Table)

## Usage

1. Register or log in to your account.
2. Explore and search for recipes.
3. Contribute your own recipes.
4. Receive alerts when new recipes are added


