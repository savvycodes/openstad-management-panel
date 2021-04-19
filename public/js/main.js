'use strict';


initHideFlash();


function initHideFlash() {
  $('.flash-container .close-button').click(function() {
    $(this).closest('.flash-container').remove();
  });

  setTimeout(function() {
    $('.flash-container').remove();
  }, 5000);
}

$(function () {

  // # CREATE SITE FORM VALIDATION
  var existingDomains = [];

  $.validator.addMethod("uniqueDomain", function (value, element) {
    var isValid = false;

    var domainType = $('input[name="domain-type"]:checked').val();
    var wildcardHost = $('input[name="wildcardHost"]').val();
    var domainValue = domainType === 'subdomain' ? value + wildcardHost : value;
    var existingDomains = $('input[name="domain"]').data('existing-domains').split(',');

    return existingDomains.indexOf(domainValue.replace('https://', '').replace('http://', '').replace('www.', '')) === -1;
  });

  $('.domain-type').change(function (event) {
    var domainType = $('input[name="domain-type"]:checked').val();

    if (domainType === 'domain') {
      $('.wildcardHost').addClass('d-none');
    } else {
      $('.wildcardHost').removeClass('d-none');
    }
  });

  $('#create-site-form').validate({
    rules: {
      domain: {
        uniqueDomain: true,
        required: true
      }
    },
    messages: {
      domain: {
        uniqueDomain: 'Domain already exists'
      }
    }
  });

  // filter everythings but dots and alphanumeric from domain fields, also no other specialchars allowed
  $(".valid-domain-character").keypress(function(event) {
      var key = event.which;
      var keychar = String.fromCharCode(key).toLowerCase();

      if ((("abcdefghijklmnopqrstuvwxyz0123456789-.:/").indexOf(keychar) === -1)) {
         event.preventDefault();
         return false;
      }
  });




  $(".valid-domain-character").on('input', function(event) {
    //also enfore lowercase
    var lowercaseValue = $(this).val().toLowerCase();

    // remove all chars that are not alpha numeric
    lowercaseValue = lowercaseValue.replace(/[^a-zA-Z0-9-.://_]/g, "");

    $(this).val(lowercaseValue);
  });

  // #3. FORM VALIDATION

  $('.validate-form').each(function() {
    $(this).validate();
  })

  $('#dataTable1').dataTable();

  // #4. DATE RANGE PICKER

  //$('input.single-daterange').daterangepicker({ "singleDatePicker": true });
  //$('input.multi-daterange').daterangepicker({ "startDate": "03/28/2017", "endDate": "04/06/2017" });

  // #5. DATATABLES

  if ($('#formValidate').length) {
    $('#formValidate').validator();
  }

  function userColumns () {
    return  [
       { data: "id" },
       { data: "firstName" },
       { data: "lastName" },
       { data: "email" },
       { data: "id",
         render: function (val) {
           return '<a href="/admin/user/'+val+'" target="_blank">Edit</a>'
        }
      }
    ];
  }

  function uniqueCodeColumns () {
    return  [
       { data: "id" },
       { data: "code" },
       { data: "userId", render:  function (val) { return val ? 'yes' : 'no'  } },
       { data: function(row, type, set) {
          return row;
       }, render:  function (val, row) {
         return val.userId ? '<a href="/admin/unique-code/reset/'+val.id+'">Reset </a>' : '' }
       },
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


  if ($('.select2').length) {
    $('.select2').select2();
  }

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
