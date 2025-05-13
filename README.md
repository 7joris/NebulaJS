# 🤖 Nebula - Multifunctional Discord Bot

Nebula is an all-in-one Discord bot offering advanced features for moderation, tickets, welcome, logs, and much more.

![Nebula Banner](https://cdn.discordapp.com/attachments/1369711051234611242/1369716788824379544/363af73b03292427afc429fe23410b1a.gif?ex=6824c8aa&is=6823772a&hm=335387a118e96a1c63aa41e99976bc2d07c690c23b41a2cfdb3d8c483165c8ab&)

## ✨ Features

### 🎫 Ticket System
- Ticket creation via drop-down menu
- Customizable categories (help, partnership, purchase)
- Automated ticket closure
- Staff notification

### 🛡️ Moderation
- Configurable link filtering
- Detailed logs of all actions
- Rules system with mandatory acceptance
- Seller feedback system (`/rep sale`)

### 👋 Welcome/Goodbye System
- Customizable messages for new members
- Private Welcome Messages
- Personalized Goodbye Messages
- Embed with Images and Thumbnails

### 🔊Dynamic Voice Chats
- Automatic Voice Chat Creation
- Deletion of Empty Chats
- Customizable Permissions

### 📊 Other Features
- Custom Status System with Associated Roles
- Information Commands (`/serverinfo`, `/userinfo`)
- Top Seller Rankings (`/topreseller`)
- Complete Logging System (Chats, Roles, Members, Messages)

## 🚀Installation

1. **Prerequisites**:
- [Node.js v16 or higher](https://nodejs.org/en)
- [sqlite3](https://www.npmjs.com/package/sqlite3)
- [Valid Discord bot token](https://discord.com/developers/applications)

2. **Configuration**:
```bash
clone git https://github.com/7joris/NebulaJS.git
```
```bash
cd nebula-bot
```
```bash
npm install
```

3. **Configure the config.json file**:
```
{
  "token": "YOUR_TOKEN_HERE",
  "prefix": "/",
  // ... other configurations
}
```

4. **Launch the bot:**
```bash
npm start
```
