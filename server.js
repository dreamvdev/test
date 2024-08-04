const HTTP_PORT = process.env.PORT || 3000;

const express = require("express");
const exphbs = require('express-handlebars');
const path = require("path");
const fs = require('fs');
const session = require('express-session');
const randomstring = require('randomstring');
const app = express();

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: false,
    partialsDir: path.join(__dirname, 'views/partials')
}));

app.set("view engine", ".hbs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: randomstring.generate(32),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3 * 60 * 1000 } 
}));

app.get("/", function(req, res){
    res.render('landing', {});
});

app.get("/signin", function(req, res){
    res.render('signin', { title: 'Sign In' });
});

app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

    if (!users[username]) {
        return res.render('signin', { title: 'Sign In', error: 'Not a registered username' });
    }

    if (users[username] !== password) {
        return res.render('signin', { title: 'Sign In', error: 'Invalid password' });
    }

    req.session.username = username;
    req.session.sessionID = randomstring.generate(32);

    res.redirect(`/home`);
});

app.get("/home", (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }

    const books = JSON.parse(fs.readFileSync('books.json', 'utf8'));
    const availableBooks = books.filter(book => book.available);
    const borrowedBooks = books.filter(book => !book.available);

    res.render('home', {
        title: 'Home Page',
        showSignout: true,
        username: req.session.username,
        availableBooks,
        borrowedBooks
    });
});

app.post('/borrow', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }

    const books = JSON.parse(fs.readFileSync('books.json', 'utf8'));
    const borrowedBooks = req.body.books;
    if (Array.isArray(borrowedBooks)) {
        borrowedBooks.forEach(borrowedTitle => {
            const book = books.find(b => b.title === borrowedTitle);
            if (book) book.available = false;
        });
    } else {
        const book = books.find(b => b.title === borrowedBooks);
        if (book) book.available = false;
    }

    fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
    res.redirect('/home');
});

app.post('/return', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }

    const books = JSON.parse(fs.readFileSync('books.json', 'utf8'));
    const returnedBooks = req.body.books;
    if (Array.isArray(returnedBooks)) {
        returnedBooks.forEach(returnedTitle => {
            const book = books.find(b => b.title === returnedTitle);
            if (book) book.available = true;
        });
    } else {
        const book = books.find(b => b.title === returnedBooks);
        if (book) book.available = true;
    }

    fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
    res.redirect('/home');
});

app.get('/signout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/home');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

const server = app.listen(HTTP_PORT, () => {
    console.log(`Listening on port ${HTTP_PORT}`);
});
