var Table = require('../models/Table');

var TableController = {};

/**
 * Update any field in the Faqs.
 * @param  {String}   field    Name of the field
 * @param  {Any}      value    Value to replace it to
 * @param  {Function} callback args(err, settings)
 */
TableController.updateById = function(id, data, callback){
  if (id)
  {
    Table.findOneAndUpdate({
      _id: id
    },
      {
        $set: data
      },
      {
        new: true
      },
      callback);
  }
  else
  {
    console.log("new table")
    var table = new Table();
    for (var key in data) {
      table[key] = data[key];
    }
    table.save(function(err){
      if (err){
        console.log(err)
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'Table created but error occurred for processing plus ones'
          }, undefined);
        }

        return callback(err, undefined);
      } else {
        return callback(err, table);
      }
    });

  }
};

TableController.getTables = function(callback){
  Table.getTables(function(err, tables){
    if (err)
    {
      console.log(err);
    }
    else
    {
      // handle empty faqs case
      if (!tables) {
        tables = [];
        return callback(err, tables)
      }
    }
    callback(err, tables);
  });
};

module.exports = TableController;