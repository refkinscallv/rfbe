'use strict';

// Initialize required modules and configurations
require('dotenv').config();
require('module-alias/register');

// Initialize bootrap file
const Bootstrap = require('@core/bootstrap.core');

// Start the application
Bootstrap.run();
