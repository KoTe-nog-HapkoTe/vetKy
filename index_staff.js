const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const {
    ClientModel,
    PetModel,
    DataModel, 
    InfoModel, 
    StaffModel, 
    StaffDates, 
    AppointmentModel, 
    InventaryModel, 
    UsedModel, 
    UsedInventary 
} = require('./models');

const app = express();

const cors = require('cors');
const { where } = require('sequelize');
app.use(cors({
    credentials: true ,
    origin: 'http://localhost:3000'
}));

const JWT_SECRET = 'your_secret_key_here';

app.use(bodyParser.json());

// Создание записи в таблице Data
app.post('/data', async (req, res) => {
    try {
        const { Data, Times } = req.body;
        const newData = await DataModel.create({ Data, Times });
        res.status(201).json(newData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание записи в таблице Info
app.post('/info', async (req, res) => {
    try {
        const { Name, Price, Note } = req.body;
        const newInfo = await InfoModel.create({ Name, Price, Note });
        res.status(201).json(newInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание записи в таблице Staff
app.post('/staff/register', async (req, res) => {
    try {
        const { Name, Special, Role, Phone, Mail, Password, Info_ID, Date_IDs } = req.body;
        // Проверка на существование пользователя с таким же Email
        const existingStaff = await StaffModel.findOne({ where: { Mail } });
        if (existingStaff) {
            return res.status(400).json({ error: 'Пользователь с таким Email уже существует.' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(Password, 10);

        const newStaff = await StaffModel.create({
            Name,
            Special,
            Role,
            Phone,
            Mail,
            Password: hashedPassword,
            Info_ID,
        });

        if (Date_IDs && Array.isArray(Date_IDs)) {
            const staffDates = Date_IDs.map((Date_ID) => ({ Staff_ID: newStaff.Staff_ID, Date_ID }));
            await StaffDates.bulkCreate(staffDates);
        }

        res.status(201).json(newStaff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Создание записи в таблице Appointment
app.post('/appointment', async (req, res) => {
    try {
        const { Pet_ID, Staff_ID, Info_ID, Date, Time, Note } = req.body;

        const newAppointment = await AppointmentModel.create({
            Pet_ID,
            Staff_ID,
            Info_ID,
            Date,
            Time,
            Note,
        });
        res.status(201).json(newAppointment);
    } catch (error) {
        console.error("Ошибка на сервере:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/appointments', async(req,res) => {
    try{
        const { Staff_ID } = req.body;
        const appointment = await AppointmentModel.findAll(
            {where:  {"Staff_ID" :Staff_ID} }
        )
        res.status(200).json(appointment);
    }
    catch (error){
        res.status(500).json({ error: error.message });
    }
    
})
app.post('/appointments/pet', async(req,res) => {
    try{
        const  { id } = req.body;
        const pet = await PetModel.findOne(
            {where:  {"id" : id} }
        )
        res.status(200).json(pet);
    }
    catch (error){
        res.status(500).json({ error: error.message });
    }
})

app.post('/appointments/info', async(req,res) => {
    try{
        const  { Info_ID } = req.body;
        const info = await InfoModel.findOne(
            {where:  {"Info_ID" : Info_ID} }
        )
        res.status(200).json(info);
    }
    catch (error){
        res.status(500).json({ error: error.message });
    }
})

app.get('/appointments/:id', async(req,res) => {
    try{
        const  params_Staff_ID  = req.params.id;
        const appointment = await AppointmentModel.findAll({where : { "Staff_ID" : params_Staff_ID }})
        res.status(200).json(appointment);
        
    }
    catch (error){
        res.status(500).json({ error: error.message });
    }
    
})

app.post('/delte/staff', async(req,res) => {
    try{
        const  { Staff_ID } = req.body;
        await StaffModel.destroy({where : { "Staff_ID" : Staff_ID }})
        res.status(200).json("удолен");
    }
    catch (error){
        res.status(500).json({ error: error.message });
    }
})

const axios = require("axios");
const stripe = require("stripe")("sk_test_51Qk0n6PvAB5xjcYjRJ1CVnC6onog16URtwuIRHegmfWH1NPTYnnqrPKZVIgd9QC9NFNWsrSYsUCyeO3u0lDf7Tio00t80iEwxI");

app.post("/appointments/comleted", async (req, res) => {
    try {
        const { Appointment_ID } = req.body;

        // Находим запись о приёме
        const appointment = await AppointmentModel.findByPk(Appointment_ID);

        if (!appointment) {
            return res.status(404).json({ error: "Приём не найден." });
        }

        // Меняем статус выполнения
        appointment.Completed = !appointment.Completed;
        await appointment.save();

        // Находим ID клиента через привязанный Pet_ID
        const pet = await PetModel.findByPk(appointment.Pet_ID);

        if (!pet) {
            return res.status(404).json({ error: "Питомец не найден." });
        }

        const client = await ClientModel.findByPk(pet.client_id);


        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name :'Node.js and expess'
                        },
                        unit_amount: 50*100
                    },
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: `http://localhost:3000/appointments/payment-success`,
            cancel_url: `http://localhost:3000/appointments/payment-cancel`,
        })
        console.log(session)
        if (!client || !client.chatId) {
            console.warn("Клиент не найден или отсутствует chatId.");
        } else {
            // Отправка уведомления в Telegram
            const TELEGRAM_API_TOKEN = "7625955054:AAGcoco25FpNayUNavNnlREDRg4EiVCGnnc";
            const message = `Здравствуйте, ${client.name}!\n\nСтатус вашего приёма для питомца ${pet.name} был изменён: ${
                appointment.Completed ? "Выполнено" : "Не выполнено"
            }.\nДата: ${appointment.Date}\nВремя: ${appointment.Time}\n платеж по ${session.url}`;

            try {
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`, {
                    chat_id: client.chatId,
                    text: message,
                });
                console.log("Уведомление отправлено в Telegram.");
            } catch (error) {
                console.error("Ошибка при отправке уведомления в Telegram:", error.message);
            }
        }

        // Ответ клиенту
        res.status(200).json(appointment);
    } catch (error) {
        console.error("Ошибка:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Создание записи в таблице Inventary
app.post('/inventary', async (req, res) => {
    try {
        const { Name, Count, Note } = req.body;
        const newInventary = await InventaryModel.create({ Name, Count, Note });
        res.status(201).json(newInventary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание записи в таблице Used
app.post('/used', async (req, res) => {
    try {
        const { Appointment_ID, Count, Inventary_IDs } = req.body;

        // Проверка, что Inventary_IDs предоставлены
        if (!Inventary_IDs || !Array.isArray(Inventary_IDs)) {
            return res.status(400).json({ error: 'Inventary_IDs must be an array of IDs' });
        }

        // Проверка наличия и достаточного количества предметов в инвентаре
        for (const Inventary_ID of Inventary_IDs) {
            const inventoryItem = await InventaryModel.findByPk(Inventary_ID);
            if (!inventoryItem) {
                return res.status(404).json({ error: `Inventary item with ID ${Inventary_ID} not found` });
            }
            if (inventoryItem.Count < Count) {
                return res.status(400).json({
                    error: `Not enough inventory for item with ID ${Inventary_ID}. Available: ${inventoryItem.Count}, Required: ${Count}`,
                });
            }
        }

        // Создание записи в таблице Used
        const newUsed = await UsedModel.create({
            Appointment_ID,
            Count,
        });

        // Создание связей в таблице UsedInventary и уменьшение Count в Inventary
        for (const Inventary_ID of Inventary_IDs) {
            await UsedInventary.create({ Used_ID: newUsed.Used_ID, Inventary_ID });

            // Уменьшение количества в Inventary
            const inventoryItem = await InventaryModel.findByPk(Inventary_ID);
            inventoryItem.Count -= Count;
            await inventoryItem.save();
        }

        res.status(201).json(newUsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/added', async (req, res) => {
    try {
        const { Appointment_ID, Count, Inventary_IDs } = req.body;

        // Проверка, что Inventary_IDs предоставлены
        if (!Inventary_IDs || !Array.isArray(Inventary_IDs)) {
            return res.status(400).json({ error: 'Inventary_IDs must be an array of IDs' });
        }

        // Проверка наличия и достаточного количества предметов в инвентаре
        for (const Inventary_ID of Inventary_IDs) {
            const inventoryItem = await InventaryModel.findByPk(Inventary_ID);
            if (!inventoryItem) {
                return res.status(404).json({ error: `Inventary item with ID ${Inventary_ID} not found` });
            }
            if (inventoryItem.Count < Count) {
                return res.status(400).json({
                    error: `Not enough inventory for item with ID ${Inventary_ID}. Available: ${inventoryItem.Count}, Required: ${Count}`,
                });
            }
        }

        // Создание записи в таблице Used
        const newUsed = await UsedModel.create({
            Appointment_ID,
            Count,
        });

        // Создание связей в таблице UsedInventary и уменьшение Count в Inventary
        for (const Inventary_ID of Inventary_IDs) {
            await UsedInventary.create({ Used_ID: newUsed.Used_ID, Inventary_ID });

            // Уменьшение количества в Inventary
            const inventoryItem = await InventaryModel.findByPk(Inventary_ID);
            inventoryItem.Count += Count;
            await inventoryItem.save();
        }

        res.status(201).json(newUsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Получение всех записей Pet
app.get('/pets', async (req, res) => {
    try {
        const pet = await PetModel.findAll();
        res.status(200).json(pet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Pet
app.post('/staffdata', async (req, res) => {
    const { Staff_ID } = req.body;
    try {
        const staffdata = await StaffDates.findAll(
            {where: {"Staff_ID" : Staff_ID} }
        );
        res.status(200).json(staffdata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Staff
app.get('/staff', async (req, res) => {
    try {
        const staff = await StaffModel.findAll();
        res.status(200).json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Data
app.get('/data', async (req, res) => {
    try {
        const data = await DataModel.findAll();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Info
app.get('/info', async (req, res) => {
    try {
        const info = await InfoModel.findAll();
        res.status(200).json(info);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Inventary
app.get('/inventary', async (req, res) => {
    try {
        const inventary = await InventaryModel.findAll();
        res.status(200).json(inventary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех записей Used
app.get('/used', async (req, res) => {
    try {
        const used = await UsedModel.findAll({
            include: [
                { model: AppointmentModel, attributes: ['Date', 'Time', 'Note'] },
                { model: InventaryModel, through: { attributes: [] }, attributes: ['Name', 'Count'] },
            ],
        });
        res.status(200).json(used);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Маршрут для входа сотрудника
app.post('/staff/login', async (req, res) => {
    try {
        const { Mail, Password } = req.body;

        // Проверка, существует ли сотрудник с таким email
        const staff = await StaffModel.findOne({ where: { Mail } });

        if (!staff) {
            return res.status(404).json({ error: 'Пользователь с таким email не найден.' });
        }

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(Password, staff.Password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный пароль.' });
        }

        // Генерация JWT токена
        const token = jwt.sign(
            { staffId: staff.Staff_ID, name:staff.Name , spcial: staff.Special ,role: staff.Role },
            JWT_SECRET,
            { expiresIn: '1h' } // Токен действует 1 час
        );

        res.status(200).json({ message: 'Успешный вход.', token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Пример защищенного маршрута
app.get('/staff/protected', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Необходима авторизация.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ message: 'Доступ разрешен.', data: decoded });
    } catch (error) {
        res.status(403).json({ error: 'Неверный или истекший токен.' });
    }
});

app.get("/api", async(req,res) => {
    res.json({
        message: "Пизда"
    })
})

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
