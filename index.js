const TelegramApi = require('node-telegram-bot-api');
const sequelize = require('./bd');

const { ClientModel, PetModel, AppointmentModel, StaffModel, DataModel, InfoModel } = require('./models');

const token = "7625955054:AAGcoco25FpNayUNavNnlREDRg4EiVCGnnc";

const bot = new TelegramApi(token, { polling: true });

const chat = {}; // Для отслеживания статуса пользователей

bot.setMyCommands([
    { command: '/start', description: 'Начало' },
    { command: '/info', description: 'Информация' },
    { command: '/appointment', description: 'Запись на прием' }
]);

const infoOption = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: 'Личная информация', callback_data: '/getInfo' }],
            [{ text: 'Добавить питомца', callback_data: '/addPet' }]
        ]
    })
};

const getInfo = async (chatId) => {
    await bot.sendMessage(chatId, 'Выберите действие:', infoOption);
};

const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
    } catch (e) {
        console.log('Ошибка подключения к БД:', e);
    }

    bot.on('message', async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;

        try {
            if (text === '/start') {
                let client = await ClientModel.findOne({ where: { chatId: String(chatId) } });
                if (!client) {
                    await ClientModel.create({ chatId: String(chatId) });
                    getInfo(chatId);
                    return bot.sendMessage(chatId, "Анкета начата. Нажмите кнопку, чтобы продолжить.");
                } else {
                    chat[chatId] = { step: 'menu' };
                    return bot.sendMessage(chatId, 'Добро пожаловать! Выберите действие:', infoOption);
                }
            }

            if (text === '/info') {
                const client = await ClientModel.findOne({
                    where: { chatId: String(chatId) },
                    include: [PetModel],
                });

                if (!client) {
                    return bot.sendMessage(chatId, 'Информация о клиенте не найдена. Пожалуйста, начните с команды /start.');
                }

                const petsInfo = client.pets.length > 0
                    ? client.pets.map((pet) => `- ${pet.name}`).join('\n')
                    : 'Нет зарегистрированных питомцев.';

                const infoMessage = `Ваше имя: ${client.name || 'не указано'}\n` +
                    `Ваш телефон: ${client.phone || 'не указан'}\n` +
                    `Ваши питомцы:\n${petsInfo}`;

                return bot.sendMessage(chatId, infoMessage);
            }

            if (text === '/appointment') {
                const client = await ClientModel.findOne({
                    where: { chatId: String(chatId) },
                    include: [PetModel],
                });

                if (!client || client.pets.length === 0) {
                    return bot.sendMessage(chatId, 'У вас нет зарегистрированных питомцев. Сначала добавьте питомца с помощью команды /addPet.');
                }

                chat[chatId] = { step: 'select_pet', appointment: {} };
                const petOptions = client.pets.map((pet) => [{ text: pet.name, callback_data: `pet_${pet.id}` }]);
                return bot.sendMessage(chatId, 'Выберите питомца:', {
                    reply_markup: JSON.stringify({ inline_keyboard: petOptions }),
                });
            }

            if (chat[chatId]?.step === 'note') {
                chat[chatId].appointment.note = text;
                const { petId, infoId, staffId, dateId, time, note } = chat[chatId].appointment;

                // Сохранение записи на прием
                await AppointmentModel.create({
                    Pet_ID: petId,
                    Staff_ID: staffId,
                    Info_ID: infoId,
                    Date: dateId,
                    Time: time,
                    Note: note || '',
                });

                delete chat[chatId];
                return bot.sendMessage(chatId, 'Запись на прием успешно завершена!');
            }

            return bot.sendMessage(chatId, 'Неизвестная команда.');
        } catch (e) {
            console.error(e);
            return bot.sendMessage(chatId, `Произошла ошибка: ${e.message}`);
        }
    });

    bot.on('callback_query', async (msg) => {
        const data = msg.data;
        const chatId = msg.message.chat.id;

        try {
            if (data === '/getInfo') {
                chat[chatId] = { step: 'name' };
                return bot.sendMessage(chatId, 'Введите ваше имя:');
            }

            if (data === '/addPet') {
                chat[chatId] = { step: 'pet_name' };
                return bot.sendMessage(chatId, 'Введите имя питомца:');
            }

            if (data.startsWith('pet_')) {
                chat[chatId].appointment.petId = Number(data.split('_')[1]);
                chat[chatId].step = 'select_info';

                const info = await InfoModel.findAll();
                const infoOptions = info.map((service) => [{ text: service.Name, callback_data: `info_${service.Info_ID}` }]);
                return bot.sendMessage(chatId, 'Выберите услугу:', {
                    reply_markup: JSON.stringify({ inline_keyboard: infoOptions }),
                });
            }

            if (data.startsWith('info_')) {
                chat[chatId].appointment.infoId = Number(data.split('_')[1]);
                chat[chatId].step = 'select_staff';

                const staff = await StaffModel.findAll({
                    where: { Info_ID: chat[chatId].appointment.infoId },
                });
                const staffOptions = staff.map((doc) => [{ text: doc.Name, callback_data: `staff_${doc.Staff_ID}` }]);
                return bot.sendMessage(chatId, 'Выберите врача:', {
                    reply_markup: JSON.stringify({ inline_keyboard: staffOptions }),
                });
            }

            if (data.startsWith('staff_')) {
                chat[chatId].appointment.staffId = Number(data.split('_')[1]);
                chat[chatId].step = 'select_date';

                const dates = await DataModel.findAll();
                const dateOptions = dates.map((date) => [{ text: date.Data, callback_data: `date_${date.Data_ID}` }]);
                return bot.sendMessage(chatId, 'Выберите дату:', {
                    reply_markup: JSON.stringify({ inline_keyboard: dateOptions }),
                });
            }

            if (data.startsWith('date_')) {
                chat[chatId].appointment.dateId = Number(data.split('_')[1]);
                chat[chatId].step = 'select_time';

                const times = await DataModel.findByPk(chat[chatId].appointment.dateId);
                const timeOptions = times.Times.map((time) => [{ text: time, callback_data: `time_${time}` }]);
                return bot.sendMessage(chatId, 'Выберите время:', {
                    reply_markup: JSON.stringify({ inline_keyboard: timeOptions }),
                });
            }

            if (data.startsWith('time_')) {
                chat[chatId].appointment.time = data.split('_')[1];
                chat[chatId].step = 'note';

                return bot.sendMessage(chatId, 'Введите дополнительные примечания (если есть):');
            }

            if (data === '/getInfo') {
                chat[chatId] = { step: 'name' };
                return bot.sendMessage(chatId, 'Введите ваше имя:');
            }

            if (data === '/addPet') {
                chat[chatId] = { step: 'pet_name' };
                return bot.sendMessage(chatId, 'Введите имя питомца:');
            }
        } catch (e) {
            console.error(e);
            return bot.sendMessage(chatId, `Произошла ошибка: ${e.message}`);
        }
    });
};

start();
