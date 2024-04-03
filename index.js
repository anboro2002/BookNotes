process.env.TZ = 'UTC';
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "BookNotes",
  password: "eusuntandrei2002",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let books =[];

app.get("/", async (req, res) =>{
  try{
    let sortBy = req.query.sortBy;
    let query = "SELECT * FROM books";

    switch (sortBy) {
      case "1":
        query += " ORDER BY rating ASC";
        break;
      case "2":
        query += " ORDER BY rating DESC";
        break;
      case "3":
        query += " ORDER BY date_read ASC";
        break;
      case "4":
        query += " ORDER BY date_read DESC";
        break;
      default:
        break;
    }

    const result = await db.query(query);
    const books = result.rows;

    // Promise.all() -> handle multiple asynchronous operations concurrently and wait for all of them to complete
    //books.map() -> iterate over each book in the books array and fetch its cover image asynchronously using Axios
    // {...book, image: response.data } returns a new object containing the original book object's properties spread with { ...book }, along with an additional property image, which holds the retrieved book cover image data
    const booksWithImages = await Promise.all(books.map(async (book) => {
      const response = await axios.get(`https://api.bookcover.longitood.com/bookcover/${book.isbn_code}`);
      return { ...book, image: response.data };
    }));

    res.render("index.ejs", {
      books: booksWithImages
    });
  } catch(err){
    console.log(err);
  }
});

app.get("/create", (req, res) =>{
  res.render("create.ejs");
})

app.post("/new", async (req, res) =>{
  try{
    const { name, description, rating, date_read, isbn_code} = req.body;
    const result = await db.query(
      "INSERT INTO books(name, description, rating, date_read, isbn_code) VALUES ($1, $2, $3, $4, $5)",
      [name, description, rating, date_read, isbn_code]
    );
    res.redirect("/");
  } catch(err){
    console.log(err);
  }
})

app.get("/update/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);
    const book = result.rows[0];
    res.render("edit.ejs", { book: book });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving book details");
  }
});

app.post("/edit/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const { name, description, rating, date_read} = req.body;
    await db.query("UPDATE books SET name = $1, description = $2, rating = $3, date_read = $4 WHERE id = $5", [name, description, rating, date_read, bookId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating book details");
  }
});

app.post("/delete/:id", async (req, res) => {
  try{
    const deleteId = req.params.id;
    db.query(
      "DELETE FROM books WHERE id = $1",
      [deleteId]
    );

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });