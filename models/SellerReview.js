const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const SellerReview = sequelize.define('SellerReview', {
  sellerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  buyerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  item: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  note: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = SellerReview;