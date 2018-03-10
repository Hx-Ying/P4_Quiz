const Sequelize = require('sequelize');

const readline = require('readline');

const {models} = require('./model');

const {log, biglog, errorlog, colorize} = require('./out');

const helpCmd = rl => {
  log("Commandos:");
  log(" h|help - Muestra esta ayuda.");
  log(" list - listar los quizzes existentes");
  log(" show <id> - Muestra la pregunta y la respuesta del quiz indicado");
  log(" add - Añadir un nuevo quiz interacticamente");
  log(" delete <id> - Borrar el quiz indicado.");
  log(" edit <id> - Editar el quiz indicado.");
  log(" test <id> - Probar el quiz indicado.");
  log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes");
  log(" credits - Créditos");
  log(" q|quit - Salir del programa.");
  rl.prompt();
}

//Funciones auxiliares
const validateId = id => {

  return new Promise ((resolve, reject) => {
      if(typeof id === "undefined") {
        reject(new Error(`Falta el parámetro <id>.`));
      } else {
        id = parseInt(id);
        if(Number.isNaN(id)) {
          reject(new Error(`El valor del parámetro <id> no es un número.`))
        } else {
          resolve(id);
        }
      }
  });
};

const makeQuestion = (rl, text) => {

  return new Promise((resolve, reject) => {
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });
}


const showCmd = (rl,id) => {
  
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }
    log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
}

const addCmd = rl =>  {

  makeQuestion(rl, ' Introduzca una pregunta: ')
  .then(q => {
    return makeQuestion(rl,' Introduzca la respuesta: ')
    .then(a => {
      return {question: q, answer: a};
    });
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
  .then(quiz => {
    log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
  })
  .catch(Sequelize.validationError, error => {
    errorlog('El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

const deleteCmd = (rl,id) => {

  validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

const editCmd = (rl, id) => {

  validateId(id)
  .then(() => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz) {
      throw new Error('No existe un quiz asociado al id=${id}.');
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, ' Introduzca la pregunta: ')
    .then (q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      return makeQuestion(rl, ' Introduzca la respuesta ')
      .then (a => {
        quiz.question = q;
        quiz.answer = a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
  })
  .catch(Sequelize.validationError, error => {
    errorlog('El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

const testCmd = (rl, id) => {

  validateId(id)
  .then(() => models.quiz.findById(id))
  .then(quiz => {
    rl.question(`${colorize(quiz.question, 'red')}? `, respuesta => {
      if (respuesta.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === quiz.answer.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")) {
          log('Su respuesta es correcta.');
          biglog('Correcta', 'green');
          rl.prompt();
      } else {
          log('Su respuesta es incorrecta.');
          biglog('Incorrecta', 'red');
          rl.prompt();
      }
    });
  })
  .catch(Sequelize.validationError, error => {
    errorlog('El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });


}

const playCmd = rl => {
  let score = 0;

  const playOne = (quizzes) => {
    let index = Math.floor(Math.random()*quizzes.length);
    
    let quiz = quizzes[index];
      if (quiz === 'undefined') {
        errorlog(`El valor del parámetro id no es válido.`);
        rl.prompt();
      } else {
        rl.question(`${colorize(quiz.question, 'red')}? `, respuesta => {
          if (respuesta.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") 
            === quiz.answer.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")) {
            score++;
            log(`CORRECTO - Lleva ${score} aciertos.`);
            if(quizzes.length <= 1) {
              log('No hay nada más que preguntar.');
              log(`Fin del juego. Aciertos: ${score}`);
              biglog(`${score}`, 'magenta')
              rl.prompt();
              return;
            }
            quizzes.splice(index, 1);
            playOne(quizzes);
          } else {
              log('INCORRECTO.');
              log(`Fin del juego. Aciertos: ${score}`);
              biglog(`${score}`, 'magenta')
              rl.prompt();
              return;
          }
      });
    }
  };

  models.quiz.findAll()
  .then(quizzes =>{
    let repositorio = quizzes;
    playOne(repositorio);

  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });


}

const creditsCmd = rl => {
  log('Autores de la práctica:');
  log('Hengxuan Ying', 'green');
  rl.prompt();
}

const quitCmd = rl => {
  rl.close();
}

const listCmd = rl => {
  models.quiz.findAll()
  .each(quiz => {
      log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
}

exports = module.exports = {
  helpCmd,
  showCmd,
  addCmd,
  deleteCmd,
  editCmd,
  testCmd,
  playCmd,
  creditsCmd,
  quitCmd,
  listCmd
}