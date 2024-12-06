const TelegramApi = require('node-telegram-bot-api')

const sequelize = require('./bd');
const UserModel = require('./models');

const token = "7625955054:AAGcoco25FpNayUNavNnlREDRg4EiVCGnnc"

const bot = new TelegramApi(token, {polling: true})

const chat = {}

const gameOption = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{text: '1', callback_data: '1'},{text: '2', callback_data: '2'},{text: '3', callback_data: '3'}],
            [{text: '4', callback_data: '4'},{text: '5', callback_data: '5'},{text: '6', callback_data: '6'}],
            [{text: '7', callback_data: '7'},{text: '8', callback_data: '8'},{text: '9', callback_data: '9'}],
            [{text: '0', callback_data: '0'}],
        ]
    })
}

const gameOptionAgain = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{text: 'еще раз', callback_data: '/again',}]
        ]
    })
}

bot.setMyCommands([
    {command: '/start', description: 'начало'},
    {command: '/info', description: 'информация'},
    {command: '/game', description: 'игра'}
])

const startGame = async (chatId) => {
    await bot.sendMessage(chatId, 'угадай число')
    const rand = Math.floor(Math.random() * 10)
    chat[chatId] = rand;
    await bot.sendMessage(chatId, 'есть', gameOption)
}

const start = async () =>{

    try{
        await sequelize.authenticate()
        await sequelize.sync()

    } catch (e){
        console.log('нет родключения', e)
    }

    bot.on('message', async msg =>{
        const text = msg.text;
        const chatId = msg.chat.id;
        //console.log(msg);

        try{
            if (text == '/start'){
                await UserModel.create({chatId})
                return bot.sendMessage(chatId,`ё`);
            }
        
            if (text == '/info'){
                const user  = await UserModel.findOne({chatId})
                return bot.sendMessage(chatId, `у ${msg.from.first_name} ${user.right} правильных и ${user.wrong} неправильных` )
            }
    
            if (text == '/game'){
                return startGame(chatId);
            }
    
            return bot.sendMessage(chatId, 'хз что это')

        }catch(e) {
            return bot.sendMessage(chatId, `ошибка с бд ${e}`);
        }
        
    
    })


    bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;


        if (data === '/again'){
            return startGame(chatId);
        }

        const user = await UserModel.findOne({chatId})
        
        
        if (data == chat[chatId]){
            user.right += 1;
            await  bot.sendMessage(chatId, `угадал ${chat[chatId]}`, gameOptionAgain)
        }
        else{
            user.wrong += 1;
            await bot.sendMessage(chatId, `не угадал ${chat[chatId]}`, gameOptionAgain)
        }
        await user.save();

        //bot.sendMessage(chatId, `${data}`)
        //console.log(msg)
    })
}

start()