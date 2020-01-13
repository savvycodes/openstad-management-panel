'use strict';

/*

Main javascript functions to init most of the elements

#1. CHAT APP
#2. CALENDAR INIT
#3. FORM VALIDATION
#4. DATE RANGE PICKER
#5. DATATABLES
#6. EDITABLE TABLES
#7. FORM STEPS FUNCTIONALITY
#8. SELECT 2 ACTIVATION
#9. CKEDITOR ACTIVATION
#10. CHARTJS CHARTS http://www.chartjs.org/
#11. MENU RELATED STUFF
#12. CONTENT SIDE PANEL TOGGLER
#13. EMAIL APP
#14. FULL CHAT APP
#15. CRM PIPELINE
#16. OUR OWN CUSTOM DROPDOWNS
#17. BOOTSTRAP RELATED JS ACTIVATIONS
#18. TODO Application
#19. Fancy Selector
#20. SUPPORT SERVICE
#21. Onboarding Screens Modal
#22. Colors Toggler
#23. Auto Suggest Search
#24. Element Actions

*/

// ------------------------------------
// HELPER FUNCTIONS TO TEST FOR SPECIFIC DISPLAY SIZE (RESPONSIVE HELPERS)
// ------------------------------------

function is_display_type(display_type) {
  return $('.display-type').css('content') == display_type || $('.display-type').css('content') == '"' + display_type + '"';
}
function not_display_type(display_type) {
  return $('.display-type').css('content') != display_type && $('.display-type').css('content') != '"' + display_type + '"';
}

function initHideFlash() {
  console.log('initHideFlash', initHideFlash);
  $('.flash-container .close-button').click(function() {
    $(this).closest('.flash-container').remove();
  });

  setTimeout(function() {
    $('.flash-container').remove();
  }, 5000);
}

initHideFlash();

// Initiate on click and on hover sub menu activation logic
function os_init_sub_menus() {

  // INIT MENU TO ACTIVATE ON HOVER
  var menu_timer;
  $('.menu-activated-on-hover').on('mouseenter', 'ul.main-menu > li.has-sub-menu', function () {
    var $elem = $(this);
    clearTimeout(menu_timer);
    $elem.closest('ul').addClass('has-active').find('> li').removeClass('active');
    $elem.addClass('active');
  });

  $('.menu-activated-on-hover').on('mouseleave', 'ul.main-menu > li.has-sub-menu', function () {
    var $elem = $(this);
    menu_timer = setTimeout(function () {
      $elem.removeClass('active').closest('ul').removeClass('has-active');
    }, 30);
  });

  // INIT MENU TO ACTIVATE ON CLICK
  $('.menu-activated-on-click').on('click', 'li.has-sub-menu > a', function (event) {
    var $elem = $(this).closest('li');
    if ($elem.hasClass('active')) {
      $elem.removeClass('active');
    } else {
      $elem.closest('ul').find('li.active').removeClass('active');
      $elem.addClass('active');
    }
    return false;
  });
}

$(function () {


  // #3. FORM VALIDATION

  $('.validate-form').each(function() {
    $(this).validate();
  })

  // #4. DATE RANGE PICKER

  //$('input.single-daterange').daterangepicker({ "singleDatePicker": true });
  //$('input.multi-daterange').daterangepicker({ "startDate": "03/28/2017", "endDate": "04/06/2017" });

  // #5. DATATABLES

  if ($('#formValidate').length) {
    $('#formValidate').validator();
  }
  if ($('#dataTable1').length) {
    $('#dataTable1').DataTable({
      buttons: ['copy', 'excel', 'pdf'],
      pageLength: 50,
    });
  }

  function userColumns () {
    return  [
       { data: "id" },
       { data: "firstName" },
       { data: "lastName" },
       { data: "email" },
       { data: "id",
         render: function (val) {
           return '<a href="/admin/user/'+val+'" target="_blank">Edit </a>'
        }
      }
    ];
  }

  function uniqueCodeColumns () {
    return  [
       { data: "id" },
       { data: "code" },
       { data: "userId", render:  function (val) { return val ? 'yes' : 'no'  } },
    ];
  }

  if ($('#dataTable-ajax').length) {
    var dataColumns = $('#dataTable-ajax').attr('data-custom-columns');

    $('#dataTable-ajax').DataTable({
      buttons: ['copy', 'excel', 'pdf'],
      processing: true,
      paging: true,
      ordering: false,
      iDisplayLength: 50,
      pageLength: 50,
      ajax: function ( data, callback, settings ) {

          var apiUrl =  $('#dataTable-ajax').attr('data-src');

          var params = {
            offset: data.start,
            limit: data.length,
            //order: 'id,'
          };

          if (data.search && data.search.value && data.search.value.length >0) {
            params.search = data.search.value;
          }

          var apiQuery = jQuery.param(params);
          apiUrl = apiUrl +'?a=1&'+ apiQuery;

          $.ajax({
              url:apiUrl,
              // dataType: 'text',
              type: 'get',
              contentType: 'JSON',
              success: function( responseData, textStatus, jQxhr ){
                  callback({
                      // draw: data.draw,
                      data: responseData.data,
                      recordsTotal:  responseData.total,//data.length,
                      recordsFiltered:  responseData.total,// data.length
                  });
              },
              error: function( jqXhr, textStatus, errorThrown ){
              }
          });
      },
      serverSide: true,
    /*  columns: [
        { data: "id" },
        { data: "code" },
        { data: "userId", render:  function (val) { return val ? 'yes' : 'no'  } },
      ]*/
      columns: eval(dataColumns)()
    });

}


  // #7. FORM STEPS FUNCTIONALITY

  $('.step-trigger-btn').on('click', function () {
    var btn_href = $(this).attr('href');
    $('.step-trigger[href="' + btn_href + '"]').click();
    return false;
  });

  // FORM STEP CLICK
  $('.step-trigger').on('click', function () {
    var prev_trigger = $(this).prev('.step-trigger');
    if (prev_trigger.length && !prev_trigger.hasClass('active') && !prev_trigger.hasClass('complete')) return false;
    var content_id = $(this).attr('href');
    $(this).closest('.step-triggers').find('.step-trigger').removeClass('active');
    $(this).prev('.step-trigger').addClass('complete');
    $(this).addClass('active');
    $('.step-content').removeClass('active');
    $('.step-content' + content_id).addClass('active');
    return false;
  });
  // END STEPS FUNCTIONALITY


  // #8. SELECT 2 ACTIVATION

  if ($('.select2').length) {
    $('.select2').select2();
  }

  // #9. CKEDITOR ACTIVATION

  if ($('#ckeditor1').length) {
    CKEDITOR.replace('ckeditor1');
  }

  // INIT MOBILE MENU TRIGGER BUTTON
  $('.mobile-menu-trigger').on('click', function () {
    $('.menu-mobile .menu-and-user').slideToggle(200, 'swing');
    return false;
  });

  os_init_sub_menus();

  // #12. CONTENT SIDE PANEL TOGGLER

  $('.content-panel-toggler, .content-panel-close, .content-panel-open').on('click', function () {
    $('.all-wrapper').toggleClass('content-panel-active');
  });

  // #16. OUR OWN CUSTOM DROPDOWNS
  $('.os-dropdown-trigger').on('mouseenter', function () {
    $(this).addClass('over');
  });
  $('.os-dropdown-trigger').on('mouseleave', function () {
    $(this).removeClass('over');
  });

  // #17. BOOTSTRAP RELATED JS ACTIVATIONS

  // - Activate tooltips
//  $('[data-toggle="tooltip"]').tooltip();

  // - Activate popovers
//  $('[data-toggle="popover"]').popover();

  // #18. TODO Application

  // Tasks foldable trigger
  $('.tasks-header-toggler').on('click', function () {
    $(this).closest('.tasks-section').find('.tasks-list-w').slideToggle(100);
    return false;
  });

  // #21. Onboarding Screens Modal

  $('.onboarding-modal.show-on-load').modal('show');
  if ($('.onboarding-modal .onboarding-slider-w').length) {
    $('.onboarding-modal .onboarding-slider-w').slick({
      dots: true,
      infinite: false,
      adaptiveHeight: true,
      slidesToShow: 1,
      slidesToScroll: 1
    });

    $('.onboarding-modal').on('shown.bs.modal', function (e) {
      $('.onboarding-modal .onboarding-slider-w').slick('setPosition');
    });
  }

});
