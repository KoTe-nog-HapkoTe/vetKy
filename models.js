const sequelize = require('./bd');
const { DataTypes } = require('sequelize');

// Client
const ClientModel = sequelize.define('client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
    },
    chatId: {
        type: DataTypes.STRING,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    phone: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
});

// Pet
const PetModel = sequelize.define('pet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_id: {
        type: DataTypes.INTEGER,
        references: {
            model: ClientModel,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    species: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    allergy: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
});

// Data
const DataModel = sequelize.define('data', {
    Data_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Data: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    Times: { 
        type: DataTypes.ARRAY(DataTypes.STRING), 
        allowNull: false, defaultValue: [] 
    },
});

// Info
const InfoModel = sequelize.define('info', {
    Info_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    Note: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
});


// Staff
const StaffModel = sequelize.define('staff', {
    Staff_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Special: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Role: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Mail: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Info_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: InfoModel,
            key: 'Info_ID',
        },
        onDelete: 'CASCADE',
    },
});

// Appointment
const AppointmentModel = sequelize.define('appointment', {
    Appointment_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Pet_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: PetModel,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    Staff_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: StaffModel,
            key: 'Staff_ID',
        },
        onDelete: 'CASCADE',
    },
    Info_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: InfoModel,
            key: 'Info_ID',
        },
        onDelete: 'CASCADE',
    },
    Date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    Time: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    Note: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
    Completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    Payment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});


// Inventary
const InventaryModel = sequelize.define('inventary', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Count: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    Note: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Used
const UsedModel = sequelize.define('used', {
    Used_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Appointment_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: AppointmentModel,
            key: 'Appointment_ID',
        },
        onDelete: 'CASCADE',
    },
    Count: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

// StaffDates
const StaffDates = sequelize.define('staff_dates', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Staff_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: StaffModel,
            key: 'Staff_ID',
        },
        onDelete: 'CASCADE',
    },
    Date_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: DataModel,
            key: 'Data_ID',
        },
        onDelete: 'CASCADE',
    },
});

// UsedInventary (Many-to-Many between Used and Inventary)
const UsedInventary = sequelize.define('used_inventary', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Used_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: UsedModel,
            key: 'Used_ID',
        },
        onDelete: 'CASCADE',
    },
    Inventary_ID: {
        type: DataTypes.INTEGER,
        references: {
            model: InventaryModel,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
});

// Установление связей
ClientModel.hasMany(PetModel, { foreignKey: 'client_id', onDelete: 'CASCADE' });
PetModel.belongsTo(ClientModel, { foreignKey: 'client_id' });

StaffModel.belongsToMany(DataModel, { through: 'StaffDates', foreignKey: 'Staff_ID' });
DataModel.belongsToMany(StaffModel, { through: 'StaffDates', foreignKey: 'Data_ID' });

UsedModel.belongsToMany(InventaryModel, { through: UsedInventary, foreignKey: 'Used_ID' });
InventaryModel.belongsToMany(UsedModel, { through: UsedInventary, foreignKey: 'Inventary_ID' });

module.exports = {
    ClientModel,
    PetModel,
    DataModel,
    InfoModel,
    StaffModel,
    StaffDates,
    AppointmentModel,
    InventaryModel,
    UsedModel,
    UsedInventary,
};
