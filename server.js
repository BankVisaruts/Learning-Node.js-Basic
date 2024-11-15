const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const { PrismaClient } = require("@prisma/client");
const { getTextOfJSDocComment } = require('typescript');
const prisma = new PrismaClient();

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { verify } = require('crypto');
const { nextTick } = require('process');

//uploads
const fileUpload = require("express-fileupload");

//อ่านไฟล์ เขียนไฟล์
const fs = require('fs');

dotenv.config();

app.use(fileUpload());
app.use('/uploads', express.static('uploads'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

//เรียกใช้งาน controllers
const bookController = require('./controllers/BookController');

app.use('/book', bookController);

//อ่านไฟล์
app.get("/readFile", (req, res) => {
  try {
    fs.readFile("test.txt", (err, data) => {
      if(err) {
        throw err;
      }

      res.send(data);
    })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

//เขียนไฟล์
app.get('/writeFile', (req, res) => {
  try {
    fs.writeFile('test.txt', 'Hello by Bank', (err) => {
      if(err){
        throw err;
      }
    });

    res.send({ message: "success"});
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

app.get('/removeFile', (req, res) => {
  try {
    fs.unlinkSync('test.txt');
    res.send({ message: "success"});
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

//เช็คว่าไฟล์มีอยู่หรือเปล่า
app.get('/fileExists', (req, res) => {
  try {
    const found = fs.existsSync('package.json');
    res.send({ found: found });
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

app.post('/book/testUpload', (req, res) => {
  try {
    const myFile = req.files.myFile;

    myFile.mv('./uploads/' + myFile.name, (err) => {
      if(err){
        req.status(500).send({error: err})
      }

      res.send({ message: "success" });
    })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

//ทำ middleware
function checkSingIn(req, res, next) {
  try {
    const secret = process.env.TOKEN_SECRET;
    const token = req.headers['authorization'];
    const result = jwt.verify(token, secret);

    if (result != undefined) {
      next();
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: e.message})
  }
}

app.get('/user/info', checkSingIn, (req, res, next) => {
  res.send('Hello Backoffice user info');
})

//ความสัมพันธ์ database relation
app.get('/oneToOne', async (req, res) => {
  try {
    const data = await prisma.orderDetail.findMany({
      include: {
        book: true,
      }
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

app.get('/oneToMany', async(req, res) => {
  try {
    const data = await prisma.book.findMany({
      include: {
        orderDetails: true
      }
    })

    res.send({ results: data });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
})

app.get('/multiModel', async (req, res) => {
  try {
    const data = await prisma.customer.findMany({
      include: {
        Order: {
          include: {
            OrderDetail: true
          }
        }
      }
    })

    res.send({ results: data })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

//jwt
app.get('/user/verifyToken', (req, res) => {
  try {
    const secret = process.env.TOKEN_SECRET;
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwLCJuYW1lIjoiYmFuayIsImxldmVsIjoiYWRtaW4iLCJpYXQiOjE3MzE1OTQxMDIsImV4cCI6MTczMTY4MDUwMn0.lDTa9RpktzxGjYgMwx7FomseHlEQwGxvXv8PiLNrmFw";
    const result = jwt.verify(token, secret);

    res.send({ result: result});
  } catch (e) {
    res.status(500).send({ error: e });
  }
})

app.get('/user/createToken', (req, res) => {
  try {
    const secret = process.env.TOKEN_SECRET;
    const payload = {
      id: 100,
      name: 'bank',
      level: 'admin'
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1d'});

    res.send({ token: token });
  } catch (e) {
    res.status(500).send({ error: e });
  }
})

//database connect
app.get('/book/list', async (req, res) => {
  const data = await prisma.book.findMany();
  res.send({ data: data});
})

app.post('/book/create', async(req, res) => {
  const data = req.body;
  const result = await prisma.book.create({
    data: data,
  });

  res.send({ result: result});
})

app.post('/book/createManual', async(req, res) => {
  const result = await prisma.book.create({
    data: {
      isbn: '1002',
      name: 'PHP',
      price: 850
    }
  });

  res.send({ result: result})
});

app.put('/book/update/:id', async(req, res) => {
  try {
    await prisma.book.update({
      data: {
        isbn: '10022',
        name: 'test update',
        price: 900
      },
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.send({ message: "success"})
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.delete('/book/remove/:id', async (req, res) =>{
  try {
    await prisma.book.delete({
      where: {
        id: parseInt(req.params.id),
      },
    })
    
    res.send({ message: "success"});
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.post('/book/search', async (req, res) => {
  try {
    const keyword = req.body.keyword;
    const data = await prisma.book.findMany({
      where: {
        name: {
          contains: keyword
        }
      }
    })

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.post('/book/startsWith', async (req, res) => {
  try {
    const keyword = req.body.keyword;
    const data = await prisma.book.findMany({
      where: {
        name: {
          startsWith: keyword,
        }
      }
    })

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.post('/book/endsWith', async (req, res) => {
  try {
    const keyword = req.body.keyword;
    const data = await prisma.book.findMany({
      where: {
        name: {
          endsWith: keyword,
        }
      }
    })

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/orderBy', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      orderBy: {
        price: "desc",
      }
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/gt', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        price: {
          gt: 800, // > 800
        }
      }
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/lt', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        price: {
          lt: 800, // < 800
        }
      }
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/notNull', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        detail: {
          not: null,
        }
      }
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/null', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        detail: null,
      },
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/between', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        price: {
          lte: 800, // <= 800
          gte: 500, // >= 500
        }
      },
    })

    res.send({ results: data});
  } catch (e) {
    res.status(500).send({ error: e})
  }
});

app.get('/book/sum', async (req, res) => {
  try {
    const data = await prisma.book.aggregate({
      _sum: {
        price: true,
      },
    });

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/max', async (req, res) => {
  try {
    const data = await prisma.book.aggregate({
      _max: {
        price: true,
      },
    });

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/min', async (req, res) => {
  try {
    const data = await prisma.book.aggregate({
      _min: {
        price: true,
      },
    });

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/avg', async (req, res) => {
  try {
    const data = await prisma.book.aggregate({
      _avg: {
        price: true,
      },
    });

    res.send({ results: data})
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/findYearMonthDay', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        registerDate: new Date("2024-05-08"),
      },
    })

    res.send({ results: data })
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/findYearMonth', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      where: {
        registerDate: {
          gte: new Date("2024-05-01"), //start
          lte: new Date("2024-05-31"),   //end
        },
      },
    })

    res.send({ results: data })
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

app.get('/book/findYear', async (req, res) => {
  try {
    const data = await prisma.book.findMany({
      select: {
        registerDate: true,
      },
      where: {
        registerDate: {
          gte: new Date("2024-01-01"), //start
          lte: new Date("2024-12-31"),   //end
        },
      },
    })

    res.send({ results: data })
  } catch (e) {
    res.status(500).send({ error: e})
  }
})

//http get post put delete
app.get("/", (req, res) => {
  res.send("hello world");
});

app.get("/hello/:name", (req, res) => {
  res.send("hello " + req.params.name)
})

app.get('/hi/:name/:age', (req, res) => {
  const name = req.params.name;
  const age = req.params.age;

  //res.send("name = " + name + " age = " + age);
  res.send(`name = ${name} age = ${age}`);
})

app.post('/hello', (req, res) => {
  res.send(req.body);
})

app.put('/myPut', (req, res) => {
  res.send(req.body);
})

app.delete('/myDelete/:id', (req,res) => {
  res.send("my delete id =" + req.params.id);
})

app.listen(3001, () => {
  console.log("Server Starting on http://localhost:3001")
});