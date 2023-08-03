/*
  Copyright 2023 Jamie jamiebalfour
  This is based on the Zenith Parsing Engine which is used to compile YASS
*/


function jsParser(program){
  var elements = [];
  var symbs = '<> /=!-\n\r\t';
  var pc = 0;
  var inQuotes = false;
  function isKeySymb(chr){
    for (var i = 0; i < symbs.length; i++){
      if(chr == symbs[i]){
        return true;
      }
    }

    return false;
  }
  //Read a token
  function parse(){
    var word = "";
    //We need to read these separately from keywords
    if(program[pc] == '"' || program[pc] == "'"){
      pc++;
      return program[pc - 1];
    }
    //Key symbols return the previous symbol
    if(isKeySymb(program[pc])){
      pc++;
      return program[pc-1];
    }

    while (pc < program.length){

      //Create the word
      if(isKeySymb(program[pc])){
        return word;
      } else{
        word += program[pc];
        pc++;
      }

      if(program[pc] == '"' || program[pc] == "'"){
        return word;
      }

    }

    return null;
  }

  var symb = "";

  while(symb !== null){
    symb = parse();
    elements.push(symb);
  }

  return elements;
}

function jsCompiler(tokens){
  var output = [];
  var counter = 0;
  var running = true;
  var selfClosingTags = ["img", "br", "link", "source", "input", "iframe", "hr", "meta", "track"];

  function getNext(){
    counter++;
    while((getSymb() == " " || getSymb() == '\n' || getSymb() == '\r' || getSymb() == "\t") && counter < tokens.length && running){
      counter++;
    }
    return getSymb();
  }

  function getSymb(){
    return tokens[counter];
  }

  function peekAhead(x){
    var y = counter + 1;
    var curr = tokens[y];
    while (x > 0 && running){
      curr = tokens[y];
      if (curr !== " "){
        x--;
      }
      y++;
    }

    return curr;
  }

  function peek1(){
    return peekAhead(1);
  }

  function peek2(){
    return peekAhead(2);
  }

  function peek3(){
    return peekAhead(3);
  }

  function throwError(){
    console.log("UNEXPECTED SYMBOL");
    counter = tokens.length;
    running = false;
  }

  function isSelfClosing(n){
    for (var i = 0; i < selfClosingTags.length; i++){
      if(selfClosingTags[i] == n){
        return true;
      }
    }
    return false;
  }

  function compileAttribute(){
    var out = {};
    out.name = getSymb();
    out.value = "";

    //This attribute has an equals
    if(peek1() == "="){
      getNext();
      getNext();
      //Get rid of quote marks
      if(getSymb() == '"' || getSymb() == "'") {
        var mark = getSymb();
        getNext();
        //Get rid of quote marks
        while(getSymb() != mark && counter < tokens.length && running) {
          out.value += tokens[counter];
          counter++;
        }

      } else{
        out.value = getSymb();
      }
    }

    getNext();


    return out;
  }

  function compileText(name){
    var output = "";
    var obj = {};
    obj.name = "text";
    while(counter + 1 < tokens.length && (peek1() != "/" && peek2() != name) && getSymb() != "<" && running){
      output += tokens[counter];
      counter++;
    }

    obj.value = output;

    return obj;
  }

  function compileBlock(){
    var obj = {};

    if(getSymb() != "<"){
      //Throw an error if the symbol is unexpected
      throwError();
    }

    if(peek1().toLowerCase() == "style"){
      while(tokens[counter] !== ">"){
        counter++;
      }
      getNext();
      var output = "";
      while(counter + 2 < tokens.length && !(tokens[counter] === "<" && tokens[counter + 1] === "/" && tokens[counter + 2].toLowerCase() === "style" && running)){
        output += tokens[counter];
        counter++;
      }

      getNext();
      getNext();
      getNext();
      getNext();

      var obj = {"name" : "style", "attributes" : [], "innerElements" : [], "value" : output};
      return obj;
    }

    //Read comment or doctype
    if(peek1() == "!"){
      getNext();
      // !
      getNext();
      // - or doctype

      if(getSymb().toLowerCase() == "doctype"){
        while(getSymb() !== ">"){
          getNext();
        }

        var obj = {"name" : "doctype", "attributes" : [], "innerElements" : [], "value" : "html"};
        return obj;
      }

      getNext();
      // -
      getNext();


      var comment = "";
      while(counter < tokens.length && running){
        if(getSymb() == "-" && peek1() == "-" && peek2() == ">"){
          getNext();
          getNext();
          getNext();
          var obj = {};
          obj.name = "comment";
          obj.attributes = [];
          obj.innerElements = [];
          obj.value = comment;

          return obj;
        }

        //Add to the comment string
        comment += tokens[counter];
        counter++;


      }
    }

    var name = getNext();
    obj.name = name;
    obj.attributes = [];



    getNext();



    while(getSymb() != ">" && getSymb() != "/" && running){
      obj.attributes.push(compileAttribute());
    }

    //Self-closing tag with closing slash
    if(getSymb() == "/"){
      getNext();
    }

    //Move away from the > or the
    getNext();

    obj.innerElements = [];

    if(isSelfClosing(name)) {
      return obj;
    }

    while(peek1() != "/" && peek2() != name){
      if(getSymb() == "<"){
        obj.innerElements.push(compileBlock());
      } else{
        obj.innerElements.push(compileText(name));
      }

    }

    //Dispose of the closing tag, if there is one!
    if (getSymb() == "<"){
      getNext();

      if (getSymb() == "/"){
        getNext();

        if (getSymb() == name){
          getNext();

          if (getSymb() == ">"){
            getNext();
          }
        }
      }
    }

    return obj;

  }
  while(tokens[counter] != null && running){
    if(getSymb() == "<"){
      output.push(compileBlock());
    } else{
      output.push(compileText(""));
    }

    getNext();

  }

  if(!running){
    return false;
  }
  return output;
};
