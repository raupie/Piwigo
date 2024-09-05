$(document).ready(function() {
  // Detect unsaved changes on any inputs
  let user_interacted = false;

  $('input, textarea, select').on('focus', function() {
    user_interacted = true;
  });

  $('input, textarea').on('input', function() {
    const pictureId = $(this).parents("fieldset").data("image_id");
    if (user_interacted == true) {
      showUnsavedLocalBadge(pictureId);
    }
  });

  // Specific handler for datepicker inputs
  $('input[data-datepicker]').on('change', function() {
    const pictureId = $(this).parents("fieldset").data("image_id");
    if (user_interacted == true) {
      showUnsavedLocalBadge(pictureId);
    }
  });

  $('select').on('change', function() {
    const pictureId = $(this).parents("fieldset").data("image_id");
    if (user_interacted == true) {
      showUnsavedLocalBadge(pictureId);
    }
  });

  $('.related-categories-container .remove-item, .datepickerDelete').on('click', function() {
    user_interacted = true;
    const pictureId = $(this).parents("fieldset").data("image_id");
    showUnsavedLocalBadge(pictureId);
  });

  // METADATA SYNC
  $('.action-sync-metadata').on('click', function(event) {
    const pictureId = $(this).parents("fieldset").data("image_id");
    $.confirm({
      title: str_meta_warning,
      draggable: false,
      titleClass: "metadataSyncConfirm",
      theme: "modern",
      content: "",
      animation: "zoom",
      boxWidth: '30%',
      useBootstrap: false,
      type: 'red',
      animateFromElement: false,
      backgroundDismiss: true,
      typeAnimated: false,
      buttons: {
        confirm: {
          text: str_meta_yes,
          btnClass: 'btn-red',
          action: function() {
            disableLocalButton(pictureId);
            $.ajax({
              type: 'POST',
              url: 'ws.php?format=json',
              data: {
                method: "pwg.images.syncMetadata",
                pwg_token: jQuery("input[name=pwg_token]").val(),
                image_id: pictureId
              },
              dataType: 'json',
              success: function(data) {
                const isOk = data.stat && data.stat === "ok";
                if (isOk) {
                  updateBlock(pictureId);
                } else {
                  showErrorLocalBadge(pictureId);
                  enableLocalButton(pictureId);
                }
              },
              error: function(data) {
                console.error("Error occurred");
                enableLocalButton(pictureId);
              }
            });
          }
        },
        cancel: {
          text: str_no
        }
      }
    });
  });
  // DELETE
  $('.action-delete-picture').on('click', function(event) {
    const $fieldset = $(this).parents("fieldset");
    const pictureId = $fieldset.data("image_id");
    $.confirm({
      title: str_are_you_sure,
      draggable: false,
      titleClass: "groupDeleteConfirm",
      theme: "modern",
      content: "",
      animation: "zoom",
      boxWidth: '30%',
      useBootstrap: false,
      type: 'red',
      animateFromElement: false,
      backgroundDismiss: true,
      typeAnimated: false,
      buttons: {
        confirm: {
          text: str_yes,
          btnClass: 'btn-red',
          action: function() {
            let image_ids = [pictureId];
            (function(ids) {
              $.ajax({
                type: 'POST',
                url: 'ws.php?format=json',
                data: {
                  method: "pwg.images.delete",
                  pwg_token: jQuery("input[name=pwg_token]").val(),
                  image_id: ids.join(',')
                },
                dataType: 'json',
                success: function(data) {
                  const isOk = data.stat && data.stat === "ok";
                  if (isOk) {
                    $fieldset.remove();
                    $('.pagination-container').css({
                      'pointer-events': 'none',
                      'opacity': '0.5'
                    });
                    $('.button-reload').css('display', 'block');
                    $('div[data-image_id="' + pictureId + '"]').css('display', 'flex');
                  } else {
                    showErrorLocalBadge(pictureId);
                  }
                },
                error: function(data) {
                  console.error("Error occurred");
                }
              });
            })(image_ids);
            image_ids = [];
          }
        },
        cancel: {
          text: str_no
        }
      }
    });
  });
  // VALIDATION
  //Unit Save
  $('.action-save-picture').on('click', function(event) {
    const $fieldset = $(this).parents("fieldset");
    const pictureId = $fieldset.data("image_id");
    saveChanges(pictureId);
  });
  //Global Save
  $('.action-save-global').on('click', function(event) {
    saveAllChanges();
  });
  //Categories 
  $(".linked-albums.add-item").on("click", function() {
    b_current_picture_id = $(this).parents("fieldset").data("image_id");
    related_categories_ids = get_related_category(b_current_picture_id);
    open_album_selector();
  });
  pluginFunctionMapInit(activePlugins);
})

function get_related_category(pictureId) {
  return all_related_categories_ids.find((c) => c.id == pictureId).cat_ids ?? [];
}

function remove_related_category(cat_id, pictureId) {
  $("#" + pictureId + " .invisible-related-categories-select option[value=" + +cat_id + "]").remove();
  $("#" + pictureId + " .invisible-related-categories-select").trigger('change');
  $("#" + pictureId + " #" + cat_id).parent().remove();

  const cat_to_remove_index = all_related_categories_ids.findIndex((c) => c.id == pictureId);
  if (cat_to_remove_index > -1) {
    all_related_categories_ids[cat_to_remove_index].cat_ids.splice(cat_to_remove_index, 1);
    showUnsavedLocalBadge(pictureId);
  }
  check_related_categories(pictureId);
}

function add_related_category(cat_id, cat_link_path, pictureId) {
  related_categories_ids = get_related_category(pictureId);
  if (!related_categories_ids.includes(cat_id)) {
    $("#" + pictureId + " .related-categories-container").append(
      "<div class='breadcrumb-item album-listed'>" +
      "<span class='link-path'>" + cat_link_path + "</span><span id=" + cat_id + " class='icon-cancel-circled remove-item'></span>" +
      "</div>"
    );
    $(".search-result-item#" + cat_id).addClass("notClickable");
    related_categories_ids.push(cat_id);
    showUnsavedLocalBadge(pictureId);
    $(".invisible-related-categories-select").append("<option selected value=" + cat_id + "></option>").trigger('change');
    $("#" + cat_id).on("click", function() {
      remove_related_category(cat_id, pictureId);
    })
    close_album_selector();
  }
  check_related_categories(pictureId);
}

function check_related_categories(pictureId) {
  related_categories_ids = get_related_category(pictureId);
  $("#picture-" + pictureId + " .linked-albums-badge").html(related_categories_ids.length);
  if (related_categories_ids.length == 0) {
    $("#" + pictureId + " .linked-albums-badge").addClass("badge-red");
    $("#" + pictureId + " .add-item").addClass("highlight");
    $("#" + pictureId + " .orphan-photo").html(str_orphan).show();
  } else {
    $("#" + pictureId + " .linked-albums-badge.badge-red").removeClass("badge-red");
    $("#" + pictureId + " .add-item.highlight").removeClass("highlight");
    $("#" + pictureId + " .orphan-photo").hide();
  }
}

function updateUnsavedGlobalBadge() {
  const visibleLocalUnsavedCount = $(".local-unsaved-badge").filter(function() {
    return $(this).css('display') === 'block';
  }).length;
  if (visibleLocalUnsavedCount > 0) {
    $(".global-unsaved-badge").css('display', 'block');
    $("#unsaved-count").text(visibleLocalUnsavedCount);
  } else {
    $(".global-unsaved-badge").css('display', 'none');
    $("#unsaved-count").text('');
  }
}

function showUnsavedLocalBadge(pictureId) {
  hideSuccesLocalBadge(pictureId);
  hideErrorLocalBadge(pictureId);
  $("#picture-" + pictureId + " .local-unsaved-badge").css('display', 'block');
  updateUnsavedGlobalBadge();
}

function hideUnsavedLocalBadge(pictureId) {
  $("#picture-" + pictureId + " .local-unsaved-badge").css('display', 'none');
  updateUnsavedGlobalBadge();
}
$(window).on('beforeunload', function() {
  if (user_interacted) {
    return "You have unsaved changes, are you sure you want to leave this page?";
  }
});
//Error badge
function showErrorLocalBadge(pictureId) {
  $("#picture-" + pictureId + " .local-error-badge").css('display', 'block');
}

function hideErrorLocalBadge(pictureId) {
  $("#picture-" + pictureId + " .local-error-badge").css('display', 'none');
}
//Succes badge
function updateSuccessGlobalBadge() {
  const visibleLocalSuccesCount = $(".local-success-badge").filter(function() {
    return $(this).css('display') === 'block';
  }).length;
  if (visibleLocalSuccesCount > 0) {
    showSuccesGlobalBadge()
  } else {
    hideSuccesGlobalBadge()
  }
}

function showSuccessLocalBadge(pictureId) {
  const badge = $("#picture-" + pictureId + " .local-success-badge");
  badge.css({
    'display': 'block',
    'opacity': 1
  });
  setTimeout(() => {
    badge.fadeOut(1000, function() {
      badge.css('display', 'none');
    });
  }, 3000);
}

function hideSuccesLocalBadge(pictureId) {
  $("#picture-" + pictureId + " .local-success-badge").css('display', 'none');
}

function showSuccesGlobalBadge() {
  const badge = $(".global-succes-badge");
  badge.css({
    'display': 'block',
    'opacity': 1
  });
  setTimeout(() => {
    badge.fadeOut(1000, function() {
      badge.css('display', 'none');
    });
  }, 3000);
}

function hideSuccesGlobalBadge() {
  $("global-succes-badge").css('display', 'none');
}

function showMetasyncSuccesBadge(pictureId) {
  const badge = $("#picture-" + pictureId + " .metasync-success");
  badge.css({
    'display': 'block',
    'opacity': 1
  });
  setTimeout(() => {
    badge.fadeOut(1000, function() {
      badge.css('display', 'none');
    });
  }, 3000);
}

function disableLocalButton(pictureId) {
  $("#picture-" + pictureId + " .action-save-picture").addClass("disabled");
  $("#picture-" + pictureId + " .action-save-picture i").removeClass("icon-floppy").addClass("icon-spin6 animate-spin");
  disableGlobalButton();
}

function enableLocalButton(pictureId) {
  $("#picture-" + pictureId + " .action-save-picture").removeClass("disabled");
  $("#picture-" + pictureId + " .action-save-picture i").removeClass("icon-spin6 animate-spin").addClass("icon-floppy");
}

function disableGlobalButton() {
  $(".action-save-global").addClass("disabled");
  $(".action-save-global i").removeClass("icon-floppy").addClass("icon-spin6 animate-spin");
}

function enableGlobalButton() {
  $(".action-save-global").removeClass("disabled");
  $(".action-save-global i").removeClass("icon-spin6 animate-spin").addClass("icon-floppy");
}

function saveChanges(pictureId) {
  if ($("#picture-" + pictureId + " .local-unsaved-badge").css('display') === 'block') {
    disableLocalButton(pictureId);
    // Retrieve Infos
    const name = $("#picture-" + pictureId +" #name").val();
    const author = $("#picture-" + pictureId +" #author").val();
    const date_creation = $("#picture-" + pictureId + " #date_creation").val();
    const comment = $("#picture-" + pictureId +" #description").val();
    const level = $("#picture-" + pictureId +" #level" + " option:selected").val();
    // Get Categories
    const categories = get_related_category(pictureId);
    let categoriesStr = categories.join(';');
    // Get Tags
    let tags = [];
    $("#picture-" + pictureId +" #tags" + " option").each(function() {
      let tagId = $(this).val().replace(/~~/g, '');
      tags.push(tagId);
    });
    let tagsStr = tags.join(',');
    $.ajax({
      url: 'ws.php?format=json',
      method: 'POST',
      dataType: 'json',
      data: {
        method: 'pwg.images.setInfo',
        image_id: pictureId,
        name: name,
        author: author,
        date_creation: date_creation,
        comment: comment,
        categories: categoriesStr,
        tag_ids: tagsStr,
        level: level,
        single_value_mode: "replace",
        multiple_value_mode: "replace",
        pwg_token: jQuery("input[name=pwg_token]").val()
      },
      success: function(data) {
        const isOk = data.stat && data.stat === 'ok';
        if (isOk) {
          console.log("Data saved successfully for picture " + pictureId);
          enableLocalButton(pictureId);
          enableGlobalButton();
          hideUnsavedLocalBadge(pictureId);
          showSuccessLocalBadge(pictureId);
          updateSuccessGlobalBadge();
          // Call for extension's save
          // This is the first method we're implementing to validate extension's data
          // More informations will be provided on next skeleton update
          pluginSaveLoop(activePlugins, pictureId);
        }
        else {
          console.error("Error: " + data);
          enableLocalButton(pictureId);
          enableGlobalButton();
          hideUnsavedLocalBadge(pictureId);
          showErrorLocalBadge(pictureId);
          updateSuccessGlobalBadge();
      }
      },
      error: function(xhr, status, error) {
        enableLocalButton(pictureId);
        enableGlobalButton();
        hideUnsavedLocalBadge(pictureId);
        showErrorLocalBadge(pictureId);
        updateSuccessGlobalBadge();
        console.error('Error:', error);
      }
    });
  }
}

function saveAllChanges() {
  $("fieldset").each(function() {
    const pictureId = $(this).data("image_id");
    saveChanges(pictureId);
  });
}
//PLUGINS SAVE METHOD
const pluginFunctionMap = {};

function pluginFunctionMapInit(activePlugins) {
  activePlugins.forEach(function(pluginId) {
    const functionName = pluginId + '_batchManagerSave';
    if (typeof window[functionName] === 'function') {
      pluginFunctionMap[pluginId] = window[functionName];
    } 
  });
}

function pluginSaveLoop(activePlugins, pictureId) {
  if (activePlugins.length === 0) {
    return;
  }
  activePlugins.forEach(function(pluginId) {
    const saveFunction = pluginFunctionMap[pluginId];
    if (typeof saveFunction === 'function') {
      saveFunction(pictureId);
    } 

  });
}
//UPDATE BLOCKS (Yet to be implemented)
function updateBlock(pictureId) {
  $.ajax({
    url: 'ws.php?format=json',
    type: 'GET',
    dataType: 'json',
    data: {
      method: 'pwg.images.getInfo',
      image_id: pictureId,
      format: 'json'
    },
    success: function(response) {
      if (response.stat === 'ok') {
        $("#picture-" + pictureId + " #name-" + pictureId).val(response.result.name);
        $("#picture-" + pictureId + " #author-" + pictureId).val(response.result.author);
        $("#picture-" + pictureId + " #date_creation-" + pictureId).val(response.result.date_creation);
        $("#picture-" + pictureId + " #description-" + pictureId).val(response.result.comment);
        $("#picture-" + pictureId + " #level-" + pictureId).val(response.result.level);
        $("#picture-" + pictureId + " #filename-" + pictureId).text(response.result.file);
        $("#picture-" + pictureId + " #filesize-" + pictureId).text(response.result.filesize);
        $("#picture-" + pictureId + " #dimensions-" + pictureId).text(response.result.width + "x" + response.result.height);
        // updateTags(response.result.tags, pictureId); //Yet to be implemented
        showMetasyncSuccesBadge(pictureId);
        enableLocalButton(pictureId);
        enableGlobalButton();
      } else {
        console.error("Error:", response.message);
        showErrorLocalBadge(pictureId);
        enableLocalButton(pictureId);
        enableGlobalButton();
      }
    },
    error: function(xhr, status, error) {
      console.error("Error:", status, error);
      showErrorLocalBadge(pictureId);
      enableLocalButton(pictureId);
    }
  });
}
//TAGS UPDATE Yet to be implemented
// function updateTags(tagsData, pictureId) {
//   const $tagsUpdate = $('#tags-'+pictureId).selectize({
//     create: true,
//     persist: false
// });
//   const selectizeTags = $tagsUpdate[0].selectize;    
//   const transformedData = tagsData.map(function(item) {
//       return {
//           value: item.id,
//           text: item.name
//       };
//   })
//   console.log(transformedData);
//   selectizeTags.clearOptions();
//   selectizeTags.addOption(transformedData);
//   selectizeTags.refreshOptions(true);
// };