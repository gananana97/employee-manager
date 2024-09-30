const inquirer = require('inquirer');
const pg = require('pg');
const consoleTable = require('console.table');

const pool = new pg.Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'employee_db',
    password: 'your_password',
    port: 5432,
});

const startApp = () => {
    inquirer
        .prompt({
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'View all departments',
                'View all roles',
                'View all employees',
                'Add a department',
                'Add a role',
                'Add an employee',
                'Update an employee role',
                'Exit'
            ]
        })
        .then((answer) => {
            switch (answer.action) {
                case 'View all departments':
                    viewDepartments();
                    break;
                case 'View all roles':
                    viewRoles();
                    break;
                case 'View all employees':
                    viewEmployees();
                    break;
                case 'Add a department':
                    addDepartment();
                    break;
                case 'Add a role':
                    addRole();
                    break;
                case 'Add an employee':
                    addEmployee();
                    break;
                case 'Update an employee role':
                    updateEmployeeRole();
                    break;
                case 'Exit':
                    pool.end();
                    break;
            }
        });
};

const viewDepartments = () => {
    pool.query('SELECT * FROM departments', (error, results) => {
        if (error) throw error;
        console.table(results.rows);
        startApp();
    });
};

const viewRoles = () => {
    pool.query(
        `SELECT roles.id, roles.title, roles.salary, departments.name AS department
         FROM roles
         JOIN departments ON roles.department_id = departments.id`,
        (error, results) => {
            if (error) throw error;
            console.table(results.rows);
            startApp();
        }
    );
};

const viewEmployees = () => {
    pool.query(
        `SELECT employees.id, employees.first_name, employees.last_name, roles.title, departments.name AS department, roles.salary, managers.first_name AS manager
         FROM employees
         LEFT JOIN roles ON employees.role_id = roles.id
         LEFT JOIN departments ON roles.department_id = departments.id
         LEFT JOIN employees managers ON employees.manager_id = managers.id`,
        (error, results) => {
            if (error) throw error;
            console.table(results.rows);
            startApp();
        }
    );
};

const addDepartment = () => {
    inquirer.prompt({
        type: 'input',
        name: 'departmentName',
        message: 'What is the name of the department?'
    }).then((answer) => {
        pool.query('INSERT INTO departments (name) VALUES ($1)', [answer.departmentName], (error) => {
            if (error) throw error;
            console.log(`Department ${answer.departmentName} added!`);
            startApp();
        });
    });
};

const addRole = () => {
    // Fetch departments to choose from
    pool.query('SELECT * FROM departments', (error, results) => {
        if (error) throw error;
        const departments = results.rows.map(department => ({
            name: department.name,
            value: department.id
        }));

        inquirer.prompt([
            {
                type: 'input',
                name: 'roleTitle',
                message: 'What is the title of the role?'
            },
            {
                type: 'input',
                name: 'roleSalary',
                message: 'What is the salary for this role?'
            },
            {
                type: 'list',
                name: 'departmentId',
                message: 'Which department does this role belong to?',
                choices: departments
            }
        ]).then((answers) => {
            pool.query('INSERT INTO roles (title, salary, department_id) VALUES ($1, $2, $3)', 
            [answers.roleTitle, answers.roleSalary, answers.departmentId], (error) => {
                if (error) throw error;
                console.log(`Role ${answers.roleTitle} added!`);
                startApp();
            });
        });
    });
};

const addEmployee = () => {
    // Fetch roles and employees for selection
    pool.query('SELECT * FROM roles', (error, results) => {
        if (error) throw error;
        const roles = results.rows.map(role => ({
            name: role.title,
            value: role.id
        }));

        pool.query('SELECT * FROM employees', (error, results) => {
            if (error) throw error;
            const managers = results.rows.map(employee => ({
                name: `${employee.first_name} ${employee.last_name}`,
                value: employee.id
            }));
            managers.push({ name: 'None', value: null });

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'firstName',
                    message: 'What is the employee’s first name?'
                },
                {
                    type: 'input',
                    name: 'lastName',
                    message: 'What is the employee’s last name?'
                },
                {
                    type: 'list',
                    name: 'roleId',
                    message: 'What is the employee’s role?',
                    choices: roles
                },
                {
                    type: 'list',
                    name: 'managerId',
                    message: 'Who is the employee’s manager?',
                    choices: managers
                }
            ]).then((answers) => {
                pool.query('INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)',
                [answers.firstName, answers.lastName, answers.roleId, answers.managerId], (error) => {
                    if (error) throw error;
                    console.log(`Employee ${answers.firstName} ${answers.lastName} added!`);
                    startApp();
                });
            });
        });
    });
};

const updateEmployeeRole = () => {
    // Fetch employees to update
    pool.query('SELECT * FROM employees', (error, results) => {
        if (error) throw error;
        const employees = results.rows.map(employee => ({
            name: `${employee.first_name} ${employee.last_name}`,
            value: employee.id
        }));

        pool.query('SELECT * FROM roles', (error, results) => {
            if (error) throw error;
            const roles = results.rows.map(role => ({
                name: role.title,
                value: role.id
            }));

            inquirer.prompt([
                {
                    type: 'list',
                    name: 'employeeId',
                    message: 'Which employee’s role do you want to update?',
                    choices: employees
                },
                {
                    type: 'list',
                    name: 'roleId',
                    message: 'Which role do you want to assign to the employee?',
                    choices: roles
                }
            ]).then((answers) => {
                pool.query('UPDATE employees SET role_id = $1 WHERE id = $2', [answers.roleId, answers.employeeId], (error) => {
                    if (error) throw error;
                    console.log('Employee role updated!');
                    startApp();
                });
            });
        });
    });
};

// Start the application
startApp();
