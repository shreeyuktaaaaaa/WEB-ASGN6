// Add dotenv configuration at the top
require('dotenv').config();

// Add sequelize modules
require('pg');
const Sequelize = require('sequelize');

// Create sequelize connection
let sequelize = new Sequelize(
    process.env.PGDATABASE,
    process.env.PGUSER,
    process.env.PGPASSWORD,
    {
        host: process.env.PGHOST,
        dialect: 'postgres',
        port: 5432,
        dialectOptions: {
            ssl: { rejectUnauthorized: false }
        }
    }
);

// Define Sector model
const Sector = sequelize.define('Sector', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sector_name: Sequelize.STRING
}, {
    timestamps: false  // This disables createdAt and updatedAt
});

// Define Project model
const Project = sequelize.define('Project', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: Sequelize.STRING,
    feature_img_url: Sequelize.STRING,
    summary_short: Sequelize.TEXT,
    intro_short: Sequelize.TEXT,
    impact: Sequelize.TEXT,
    original_source_url: Sequelize.STRING
}, {
    timestamps: false  // This disables createdAt and updatedAt
});

// Create association
Project.belongsTo(Sector, {foreignKey: 'sector_id'});

// Initialize function
function initialize() {
    return new Promise((resolve, reject) => {
        sequelize.sync()
            .then(() => {
                console.log("Project data initialized successfully");
                resolve();
            })
            .catch(error => {
                reject("Failed to initialize project data: " + error);
            });
    });
}

// Get all projects 
function getAllProjects() {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector]
        })
        .then(projects => {
            if (projects.length === 0) {
                reject("No projects available - initialize first");
            } else {
                resolve(projects);
            }
        })
        .catch(error => {
            reject("Unable to get all projects: " + error.message);
        });
    });
}

// Getting project by the project ID
function getProjectById(projectId) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: { id: projectId }
        })
        .then(projects => {
            if (projects.length > 0) {
                resolve(projects[0]); // Return first element
            } else {
                reject("Unable to find requested project");
            }
        })
        .catch(error => {
            reject("Unable to find requested project: " + error.message);
        });
    });
}

// This gets projects by sector
function getProjectsBySector(sector) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: {
                '$Sector.sector_name$': {
                    [Sequelize.Op.iLike]: `%${sector}%`
                }
            }
        })
        .then(projects => {
            if (projects.length > 0) {
                resolve(projects);
            } else {
                reject("Unable to find requested projects");
            }
        })
        .catch(error => {
            reject("Unable to find requested projects: " + error.message);
        });
    });
}

// Add new project
function addProject(projectData) {
    return new Promise((resolve, reject) => {
        Project.create(projectData)
            .then(() => {
                resolve();
            })
            .catch(err => {
                reject(err.errors[0].message);
            });
    });
}

// Get all sectors
function getAllSectors() {
    return new Promise((resolve, reject) => {
        Sector.findAll()
            .then(sectors => {
                resolve(sectors);
            })
            .catch(error => {
                reject("Unable to get sectors: " + error.message);
            });
    });
}

// Edit project
function editProject(id, projectData) {
    return new Promise((resolve, reject) => {
        Project.update(projectData, {
            where: { id: id }
        })
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err.errors[0].message);
        });
    });
}

// Delete project
function deleteProject(id) {
    return new Promise((resolve, reject) => {
        Project.destroy({
            where: { id: id }
        })
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err.errors[0].message);
        });
    });
}

// Export functions
module.exports = { initialize, getAllProjects, getProjectById, getProjectsBySector, addProject, getAllSectors ,editProject ,deleteProject};
