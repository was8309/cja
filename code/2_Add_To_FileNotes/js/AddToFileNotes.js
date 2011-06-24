/*
 * AddToFileNotes.js
 *
 * Copyright (c) 2010 Dan Wasson
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 */

var myFileSpace;
var workTypeSelection = "";
var dirty = false;

function Initialize() {
  myFileSpace = new fileSpace("WorkTypesList.json");
  userjs_check();
  editControlsHide();
  workTypesSetup();
  // max out browser window
  if (window.screen) {
    var aw = screen.availWidth;
    var ah = screen.availHeight;
    window.moveTo(0, 0);
    window.resizeTo(aw, ah);
  }
}
  
function fileSpace(workTypesListFilename) { 
  this.workTypesListFilename = workTypesListFilename;
  // get base dir
    // 0         1         2         3
    // 0123456789012345678901234567890123456
    // file:///C:/CJA_Helper_v1.1/code/web/AddtoFileNotes.html"
  var myhref = window.location.href;
  if (myhref.substring(0,8) == "file:///") {
    var fileLocation = myhref.substring(8);
    var endOfBaseDirIndex = fileLocation.indexOf('/',3);   
    var baseDirTemp = fileLocation.substring(0,endOfBaseDirIndex); 
    this.baseDir = baseDirTemp.replace(/\//g,"\\");
  } else {
    alert('Sorry, Error, unknown href = ' + window.location.href + "\n\n please contact support" );         
    this.baseDir = null;
    // throw new ?
  } 
  this.FileNotesFileSpec = null;
  // initialize the member function references
  this.getFileNotesFileSpec = getFileNotesFileSpec;
  this.setFileNotesFileSpec = setFileNotesFileSpec;

  function getFileNotesFileSpec() {
     return this.FileNotesFileSpec;
  }

  function setFileNotesFileSpec(name) {
     this.FileNotesFileSpec = name;
  }
}

function userjs_check() {
  netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
  try {
      var profileDir = Components.classes["@mozilla.org/file/directory_service;1"].
                       getService(Components.interfaces.nsIProperties).
                       get("ProfD", Components.interfaces.nsIFile);
      var userjsPathName = profileDir.path + "\\user.js";
      userjsContent = 'user_pref("security.fileuri.strict_origin_policy", false);';
      var new_nsILocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      new_nsILocalFile.initWithPath(userjsPathName);
      if(!new_nsILocalFile.exists()) {
        new_nsILocalFile.create(0,0664);
        var new_nsIFileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                      createInstance(Components.interfaces.nsIFileOutputStream);
        new_nsIFileOutputStream.init(new_nsILocalFile,0x20 | 0x02,00004,null);  // write over
        new_nsIFileOutputStream.write(userjsContent,userjsContent.length);
        new_nsIFileOutputStream.flush();
        new_nsIFileOutputStream.close();
      }
    } catch(ex2) {
      alert('please contact support : error creating user.js \n\n:' + ex2);
    }
}

function workTypesSetup() {
  var workTypeList = myFileSpace.workTypesListFilename;
  $.getJSON(workTypeList,
      {},
      workTypesPopulate);
}
  
function workTypesPopulate(typeData) {
  var ol_beg = '<ul>\n';
  var ol_end = '</ul>\n';
  var li_beg = '<li>\n';
  var li_end = '</li>\n';
  var a_beg  = '<a ';
  var a_default_class = " class=mdd1_use";
  var a_onclick_beg = ' onclick="';
  var a_onclick_insert_default = 'setPerWorkTypeSelection(event)';
  var a_onclick_end = '; return false;"';
  var a_beg_close = '>';
  var a_end        = '</a>\n';
  var textToInsert = [];
  var last_indentation = 0; 
  var i = 0;
  var new_text;
  var mclass;
  var insert_function;

  for (var workTypeListCursor = 0; workTypeListCursor < typeData[0].workTypeList.length; workTypeListCursor++) {
    var typeItem = typeData[0].workTypeList[workTypeListCursor];

    selection = typeItem.lbl;
    selection = selection.replace(/^\s+|\s+$/g,"");
    mclass = null; 
    insert_function = null;
    mclass = typeItem.mclass; 
    insert_function = typeItem.insert_function;
    if ((mclass == undefined) && (insert_function == undefined)) {   
      new_text  = li_beg + a_beg + 
                  a_default_class + 
                  a_onclick_beg + 
                  a_onclick_insert_default + 
                  a_onclick_end +
                  a_beg_close + 
                  selection +
                  a_end;
    } else {
      new_text = li_beg + a_beg;
      if (mclass) {
        new_text = new_text + 'class=' + mclass + ' ';
      }
      // if (data_n01) {
      //  new_text = new_text + 'data_n01=' + data_n01 + ' ';
      // }"16a.,Telephone Call from
      if (insert_function) {
        new_text = new_text + a_onclick_beg + insert_function + a_onclick_end + a_beg_close; 
      } else {
        new_text = new_text + a_beg_close; 
      }
      new_text = new_text + selection + a_end;
    }

    if (workTypeListCursor == 0) { // first time thru       // comment here - why needed?
      textToInsert[i++] = new_text;
    } else {
      var indentation;
      for (indentation = 0; typeItem.lbl.charAt(indentation) == " "; indentation++) { }
      if (indentation > last_indentation) {
        textToInsert[i++] = ol_beg;
        last_indentation = indentation;
        textToInsert[i++] = new_text;
      } else if (indentation < last_indentation) {
        while (last_indentation > indentation) { 
          textToInsert[i++] = li_end;
          textToInsert[i++] = ol_end;
          last_indentation = last_indentation - 2;
        }
        textToInsert[i++] = li_end;
        textToInsert[i++] = new_text;
      } else { // indentation == last_indentation
        textToInsert[i++] = li_end;
        textToInsert[i++] = new_text;
      }
    }

  }
  $('ul.sf-menu').append(textToInsert.join(''));
  workTypeReset();
}

function chooseFile(fileUrl,content) {
  editControlsHide();
  netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, "Select a File to append File Notes", nsIFilePicker.modeOpen);
  var thefile = "";
  // make default directory that file picker will open with
  var dfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  var default_dir = myFileSpace.baseDir + "\\data\\FileNotes";

  dfile.initWithPath(default_dir);
  fp.displayDirectory = dfile;

  var res = fp.show();
  if (res == nsIFilePicker.returnOK){
    thefile = fp.file.path;
    theNSIfile = fp.file;
    myFileSpace.setFileNotesFileSpec(thefile);
    var fn_file = thefile;
    var dir_length = default_dir.length + 1;
    var fn_file_name_only = fn_file.substring(dir_length);    
    var fn_file_name_without_extension = fn_file_name_only.substring(0,fn_file_name_only.length - 4);    
    var fn_file_name_without_extension_split = fn_file_name_without_extension.split('@'); 
    var myClientCase = fn_file_name_without_extension_split[0] + "," + fn_file_name_without_extension_split[1];
    $('#client-case-name').text(myClientCase);
    //load file
    var inputFile = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    var readInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
    var tmp;
    inputFile.init(theNSIfile, 0x01, 444, tmp); //file, open, mode, behavior
    readInputStream.init(inputFile);
    var fileStream = readInputStream.read(-1); //fileStream now contains the file contents
    inputFile.close();
    readInputStream.close();
    // don't know whether to leave blank line
    //	$('#FileNotes').val(fileStream + "\n");
    $('#FileNotes').val(fileStream);

    // show edit controls
    $('#chooseFile').attr('disabled', 'disabled');
    $("#edit-controls").show();
    textareaelem = document.getElementById('FileNotes');
    textareaelem.scrollTop = textareaelem.scrollHeight;
    document.getElementById('datepicker').disabled=false;
    $('#slider').slider('value',.1);
    $('#amount').val(0.1);
    // scroll page down to make max room for mult ddm
    var target = $('#edit-controls');
    var top = target.offset().top;
    $('html,body').animate({scrollTop: top}, 1000);
  } else {
    alert("selection cancelled");
  }
}

function saveFile() {
  var fileUrl = myFileSpace.getFileNotesFileSpec();
  var content=$('#FileNotes').val();
  var r = mozillaSaveFile(fileUrl,content);
  if(!r) {
    alert('problem saving File Notes');
  } else {
    dirty = false;
  }  
  return r;
}

function saveQuit() { 
  if (saveFile()) {
    pageQuit();
  }
  else {
    var clientCase = $('#client-case-name').text();
    var quit = confirm(clientCase + ' - File Notes not saved  \n\n do you really want to quit?\n\n');
     if (quit) { 
       pageQuit();
    } 
  }  
}

function chooseNew() { 
  if (dirty) {
    if (confirm('File Notes have been entered, are you sure you want to start a new Client/Case without saving?')) {
      editControlsHide();
    }
  } else {
    editControlsHide();
  }
}

function chooseQuit() {
  if (dirty) {
    if (confirm('File Notes have been entered, are you sure you want to quit without saving?')) {
      pageQuit();
    }
  } else {
    pageQuit();
  }
}

function pageQuit() { 
  if ("platform" in window) {
    setTimeout("platform.quit();",1000);
  } 
  else {
    alert("Please close window using X in upper right corner of window when done");
    editControlsHide();    
  }
}

function editControlsHide() {
  // hide and reset edit controls
  $("#edit-controls").hide();
  $('#client-case-name').text('');
  $('#amount').val(0.1);
  $('#datepicker').val('');
  $('#slider').slider('value',.1);
  $('#type').val('');
  $('#FileNotes').val('');
  textareaelem = document.getElementById('FileNotes');
  textareaelem.scrollTop = textareaelem.scrollHeight;
  // scroll page back up to top
  $('html,body').animate({scrollTop: 0}, 600);
  dirty = false;
  $('#chooseFile').attr('disabled', '');
  return true;
}

function mozillaSaveFile(filePath,content) {
  if(window.Components) {
    try {
      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
      var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(filePath);
      if(!file.exists())
              file.create(0,0664);
      var out = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
      // write over
      // out.init(file,0x20|0x02,00004,null);
           out.init(file,0x20 | 0x02,00004,null);
      // append
      //   out.init(file,0x02 | 0x10 , 0666, 0); 
      // works  out.init(file, 0x02 | 0x10 , 0666, 0); 
      out.write(content,content.length);
      out.flush();
      out.close();
      return true;
    } catch(ex) {
      return false;
    }
  }
  return null;
}

$(function() {  // datepicker
  $("#datepicker").datepicker({dateFormat: 'yy-mm-dd'});
});

$(function() {  // slider  
  $("#slider").slider({
    value:0.1,
    min: 0.1,
    max: 4.0,
    step: 0.1,
    slide: function(event, ui) {
      // get rid of extra digits
      unrounded = ui.value;
      rounded_to_one = Math.round(unrounded*100)/100;   
      // make so always three chars
             if (rounded_to_one == 1) { 
        rounded_to_one = '1.0';
      } else if (rounded_to_one == 2) { 
        rounded_to_one = '2.0';
      } else if (rounded_to_one == 3) { 
        rounded_to_one = '3.0';
      } else if (rounded_to_one == 4) { 
        rounded_to_one = '4.0';
      }
      // store rounded value
      $("#amount").val(rounded_to_one);

    }
  });
  // initial value
  $("#amount").val($("#slider").slider("value"));
});

function MakeFileNote() {
  if ($('#datepicker').val() == '') {
    alert('Please choose a Date before making File Note');
    return false;
  }  
  var type = $('#type').val().replace(/^\s+|\s+$/g,"")   // remove leading and trailing white space
  if (type == '') {
    alert('Please choose a Type of Work before making File Note');
    return false;
  }  
  $('#FileNotes').val
    (   $('#FileNotes').val()  
      + $('#client-case-name').text() + ','
      + $('#datepicker').val() + ','
      + type                   + ','     
      + $('#amount').val() + '\n'
   );
  var textareaelem = document.getElementById('FileNotes');
  textareaelem.scrollTop = textareaelem.scrollHeight;
  dirty = true;
  return true;
}

function workTypeReset() {
  $('#xmulti-ddm').hide();
  $('ul.sf-menu').superfish({ 
      delay:       500,        //  delay on mouseout 
      speed:       450,        //  animation speed 
  }); 
  $('#xmulti-ddm').show();
}

function workTypeSelectionGet(e) {  
  var targ = e.target;
  var selections = new Array();
  var cursor = 0;
  selections[cursor] = targ.innerHTML;
  temptarg = targ.parentNode;
  if (temptarg.tagName == 'LI') {  // incase it is 'li a', not 'ol a'
    temptarg = temptarg.parentNode;
  }
  while ( !(temptarg.id == 'xmulti-ddm') ) {
    targ = temptarg.parentNode;
    selected_a = targ.childNodes[1];
    selected_a_usage_class = $(selected_a).attr("class").split(' ')[0];

    if (selected_a_usage_class == 'mdd1_use') {
      cursor = cursor + 1;
      selections[cursor] = selected_a.lastChild.nodeValue;
    } else if (selected_a_usage_class == 'mdd1_use_data_n01') {
      cursor = cursor + 1;
      selections[cursor] = $(selected_a).attr("data_n01");
    } 

    temptarg = targ.parentNode;
    if (temptarg.tagName == 'LI') {  // incase it is 'li a', not 'ol a'
      temptarg = temptarg.parentNode;
    }
  } 
  var choice = '';   
  for (var i = cursor; i >= 0; i--) {
    choice = choice + ' ' + selections[i]
  }
  choice = choice.replace(/^\s+|\s+$/g,"")   // remove leading and trailing white space
  return choice;
}   

function workTypeSet(val) {
  $('#type').val(val);
  workTypeReset();
  // now that type of work is set, set focus on time amount slider
  $('#slider .ui-slider-handle').focus();
}

function setPerWorkTypeSelection(e) {  
  workTypeSet(workTypeSelectionGet(e));
}

$(function() {                      // dialogs set up
  $("#dialog_for_court").dialog({
    bgiframe: true,
    autoOpen: false,
    height: 400,
    width:  800,
    modal: true,
    title:"Court Appearance qualifiers",
    buttons: {
      Ok: function() {
        var cont = "";
        if ( $('input[name="continued"]').attr('checked') ) {
          cont = " Continued";
       } else {
          cont = "";
        }
        var judge = $('input[name="select_judge"]:checked +  label').text();
        if (judge == '') {
          alert('please choose a Judge \n\n(or click Cancel to discontinue adding "' + workTypeSelection + '")\n');
        } else { 
          // $('#type').val(workTypeSelection + cont + ' - ' + judge);
          workTypeSet(workTypeSelection + cont + ' - ' + judge);
          $(this).dialog('close');
        } 
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    },
    close: function() {
      workTypeSelection = "";
    }
  });

  $("#dialog_for_conference").dialog({
    bgiframe: true,
    autoOpen: false,
    height: 250,
    width:  800,
    modal: true,
    title:"Conference qualifiers",
    buttons: {
      Ok: function() {
        multddm_fields = workTypeSelection.split(',');
        var attempted = "";
        if ( $('input[name="attempted"]').attr('checked') ) {
          attempted = "Attempted ";
        } else {
          attempted = "";
        }
        var location = $('input[name="conf_location"]:checked +  label').text();
        if (location == '') {
          alert('please choose a location \n\n(or click Cancel to discontinue adding "' + workTypeSelection + '")\n');
        } else { 
          // $('#type').val(multddm_fields[0] + ',' + attempted + multddm_fields[1] + ' ' + location);
          workTypeSet(multddm_fields[0] + ',' + attempted + multddm_fields[1] + ' ' + location);
          $(this).dialog('close');
        } 
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    },
    close: function() {
      workTypeSelection = "";
    }
  });

  $("#dialog_for_comments").dialog({
    bgiframe: true,
    autoOpen: false,
    height: 200,
    width:  800,
    modal: true,
    title:"Enter Comments",
    buttons: {
      Ok: function() {
        // remove '(enter more in Comments)'
        info_text_index = workTypeSelection.indexOf("(enter more in Comments)");
        if (info_text_index > 0) {
          workTypeSelection = workTypeSelection.substring(0,info_text_index - 1);
        }
        // change any commas in typed in Comments to spaces
        comments = $('#Comments').val().replace(/,/g," ");
        comments = comments.replace(/^\s+|\s+$/g,"")   // remove leading and trailing white space
        if (comments == '') {
          alert('please add Comments \n\n(or click Cancel to discontinue adding "' + workTypeSelection + '")\n');
        } else { 
          // $('#type').val(workTypeSelection + ' - ' + comments);
          workTypeSet(workTypeSelection + ' - ' + comments);  
          $(this).dialog('close');
        } 
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    },
    close: function() {
      workTypeSelection = "";
    }
  });

  $("#dialog_for_court_other").dialog({
    bgiframe: true,
    autoOpen: false,
    height: 200,
    width:  800,
    modal: true,
    title:"Enter Comments",
    buttons: {
      Ok: function() {
        // remove '(enter more in Comments)'
        info_text_index = workTypeSelection.indexOf("(enter more in Comments)");
        if (info_text_index > 0) {
          workTypeSelection = workTypeSelection.substring(0,info_text_index - 1);
        }
        // change any commas in typed in Comments to spaces
        comments = $('#court_other').val().replace(/,/g," ");
        comments = comments.replace(/^\s+|\s+$/g,"")   // remove leading and trailing white space
        if (comments == '') {
          alert('please add Comments \n\n(or click Cancel to discontinue adding "' + workTypeSelection + '")\n');
        } else { 
          workTypeSelection = workTypeSelection + ' - ' + comments; 
          $(this).dialog('close');
          $("#dialog_for_court").dialog('option', 'title', 'Court Appearance qualifiers (' + workTypeSelection + ')');
          $('input[name="continued"]').attr('checked', false);
          $('#dialog_for_court').dialog('open');
          $("#Ok").focus();
        } 
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    },
    close: function() {
    }
  });

});

function get_Court_stuff(e) {
  workTypeSelection = workTypeSelectionGet(e);
  $("#dialog_for_court").dialog('option', 'title', 'Court Appearance qualifiers (' + workTypeSelection + ')');
  $('input[name="continued"]').attr('checked', false);
  $('#dialog_for_court').dialog('open');
  $("#Ok").focus();
}

function get_Conference_stuff(e) {
  workTypeSelection = workTypeSelectionGet(e);
  $('#dialog_for_conference').dialog('option', 'title', 'Conference qualifiers (' + workTypeSelection + ')');
  $('input[name="attempted"]').attr('checked', false);
  $('#dialog_for_conference').dialog('open');
}

function get_More_in_Comments(e) {
  workTypeSelection = workTypeSelectionGet(e);
  $('#dialog_for_comments').dialog('option', 'title', 'enter Comments for (' + workTypeSelection + ')');
  $('#Comments').val(" ");
  $('#dialog_for_comments').dialog('open');
}

function get_Court_other(e) {
  workTypeSelection = workTypeSelectionGet(e);
  $('#dialog_for_court_other').dialog('option', 'title', 'enter Comments for (' + workTypeSelection + ')');
  $('#court_other').val(" ");
  $('#dialog_for_court_other').dialog('open');
}

//---------------------------------------------------------------------------------------------------------