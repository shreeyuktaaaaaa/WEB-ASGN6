/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Shreeyukta Sharma Student ID: 137494233 Date: 09/08/2025
*
* Published URL: https://web-322-assignment4-zeta.vercel.app/
*
********************************************************************************/

const express = require('express'); //this imports express to build the web server
const path = require('path'); //this imports path module in order to handle the file paths
const projectData = require("./modules/projects"); //this imports project data functions from local file
const authData = require("./modules/auth-service");
const clientSessions = require("client-sessions");

const app = express(); //this creates an express application
const PORT = process.env.PORT || 3000; //this uses environment port or serts the default to 3000

// This is EJS setup
app.set('view engine', 'ejs');//this sets EJS as the template engine
app.set('views', __dirname + '/views'); //this sets the folder where the EJS views are stored

//Middleware
app.use(express.json());//this is a middleware to parse JSON data from incoming requests
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));//this serves static files (like CSS,JS,images) from the 'public' folder

// Client sessions configuration
app.use(clientSessions({
    cookieName: "session",
    secret: "web322_assignment6_secret_key",
    duration: 2 * 60 * 1000, // 2 minutes
    activeDuration: 1000 * 60 // 1 minute
}));

// Make session available to all templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Middleware to ensure user is logged in
function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

// Routes

//this is for the home page route 
app.get('/', (req, res) => {
    res.render("home");//this rendera the home.ejs view 
});

// GET /login
app.get('/login', (req, res) => {
    res.render("login", { errorMessage: "", userName: "" });
});

// GET /register
app.get('/register', (req, res) => {
    res.render("register", { errorMessage: "", successMessage: "", userName: "" });
});

// POST /register
app.post('/register', (req, res) => {
    authData.registerUser(req.body)
        .then(() => {
            res.render("register", { errorMessage: "", successMessage: "User created", userName: "" });
        })
        .catch(err => {
            res.render("register", { errorMessage: err, successMessage: "", userName: req.body.userName });
        });
});

// POST /login
app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    
    authData.checkUser(req.body)
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory
            };
            res.redirect('/solutions/projects');
        })
        .catch(err => {
            res.render("login", { errorMessage: err, userName: req.body.userName });
        });
});

// GET /logout
app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

// GET /userHistory
app.get('/userHistory', ensureLogin, (req, res) => {
    res.render("userHistory");
});


//this is the about page route 
app.get('/about', (req, res) => {
    res.render("about"); //this renders the about.ejs view 
});

//this is the projects list route (with optonal filtering by sector )
app.get('/solutions/projects', (req, res) => {
    const sector = req.query.sector; //this checks if the user passed a "sector" query
    
    if (sector) {
        //if sector is given , this gets only the projects that match that sector 
        projectData.getProjectsBySector(sector)
            .then(projects => {
                res.render("projects", {projects: projects});//this renders projects.ejs with the filtered projects 
            })
            .catch(error => {
                //if no projects  are found or an error occured 
                res.status(404).render("404", {message: "No projects found for that sector"});
            });
    } else {
        //if there is no sector given this gets all the projects 
        projectData.getAllProjects()
            .then(projects => {
                res.render("projects", {projects: projects});//this renders all the projects 
            })
            .catch(error => {
                //if an error occured or no projects are found 
                res.status(404).render("404", {message: "No projects found"});
            });
    }
});

//this is the route to show only single project by its ID 
app.get('/solutions/projects/:id', (req, res) => {
    const projectId = req.params.id; //this gets the ID from the URL
    
    projectData.getProjectById(projectId)
        .then(project => {
            res.render("project", {project: project}); //this shows the specific project's details 
        })
        .catch(error => {
            res.status(404).render("404", {message: "Project not found"});//if it is not found, this shows 404 
        });
});

// GET route for add project page
app.get('/solutions/addProject', ensureLogin, (req, res) => {
    projectData.getAllSectors()
        .then(sectorData => {
            res.render("addProject", { sectors: sectorData });
        })
        .catch(error => {
            res.status(404).render("404", { message: error });
        });
});

// POST route to handle form submission
app.post('/solutions/addProject', ensureLogin, (req, res) => {
    projectData.addProject(req.body)
        .then(() => {
            res.redirect("/solutions/projects");
        })
        .catch(err => {
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

// GET route for edit project page
app.get('/solutions/editProject/:id', ensureLogin, (req, res) => {
    Promise.all([
        projectData.getProjectById(req.params.id),
        projectData.getAllSectors()
    ])
    .then(([projectData, sectorData]) => {
        res.render("editProject", { project: projectData, sectors: sectorData });
    })
    .catch(err => {
        res.status(404).render("404", { message: err });
    });
});

// POST route to handle edit form submission
app.post('/solutions/editProject', ensureLogin, (req, res) => {
    projectData.editProject(req.body.id, req.body)
        .then(() => {
            res.redirect("/solutions/projects");
        })
        .catch(err => {
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

// GET route for deleting a project
app.get('/solutions/deleteProject/:id', ensureLogin, (req, res) => {
    projectData.deleteProject(req.params.id)
        .then(() => {
            res.redirect("/solutions/projects");
        })
        .catch(err => {
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

//this catches all route for undefined paths (this is a 404 handler)
app.use((req, res) => {
    res.status(404).render("404", {message: "Page not found"}); //this renders 404 for unknown routes 
});

// Initialize project data and auth data before starting server
projectData.initialize()
    .then(authData.initialize)
    .then(() => {
        console.log("Project data initialized successfully"); //this logs the success message 
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`); //this starts the server on the defined port 
        });
    })
    .catch(error => {
         //if data initialization fails, this shows an error and doesn't start the server 
        console.error("Failed to initialize data:", error);
    });
    