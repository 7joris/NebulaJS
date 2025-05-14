module.exports = (sequelize, DataTypes) => {
    const PendingGoodbye = sequelize.define('PendingGoodbye', {
      userId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    });
  
    return PendingGoodbye;
  };