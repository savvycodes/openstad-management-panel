# Changelog

## v0.41.0
* Use networking.k8s.io/v1 version for ingress
  * IMPORTANT: This requires Kubernetes version v1.19 due to switching from networking.k8s.io/v1beta1 to networking.k8s.io/v1. 
  * See https://kubernetes.io/docs/reference/using-api/deprecation-guide/#ingress-v122 for more details.

## v0.40.0
Update version number

## v0.22.0
* Fix site delete error in k8s
* Move docker builds from travis to github actions
* Add email image header setting field to authentication tab (using filepond to upload image via the image server)
* Validate email address on special characters and reject the follow characters: ! and =

## v0.21.0
* Update react admin
* Update proxy call to API
* Add 'anonymize site' functionality
* Add extraData to newsletter export

## v0.20.0
* Rewrite of ingress logic and adding support for subdir sites (domain.com/site1 &&domain.com/site2) for Kubernetes environments
* For new sites set 2FA on by default for admin, editors & moderators

## v0.18.0
* Fix shared images between copies of sites

## v0.17.0
* Load react-admin from cdn - OPENSTAD_REACT_ADMIN_CDN in .env is now an optional overrule
* When creating a new site set contactEmail from the form

## v0.16.1 (2020-06-08)
* Add option to configure SMS sender and message.

## v0.16.0 (2020-05-25)
* Fix domain validation on site creation.
* Add phonenumber and local auth as experimental auth methods
* Turn on choice guide in react admin panel 

## v0.15.0 (2020-04-26)
* Add two factor configuration of text on screens and what role per oAuth client should validate with a Two Factor token
* Add ability to  reset two factor configuration in user edit form
* Allow for site names to have a - sign

## v0.14.1 (2021-04-19)
* Fix Site URL input

## v0.14.0 (2020-04-06)
* Cut the name for mongodb name shorter, in same cases it was too long causing an db creation error
* On input even in domain field strip special characters 
* Add options for selecting  for voting type: count per theme and budgetting per theme in site vote setting

## v0.13.0 (2021-03-17)
* Remove checkboxes in import and export for ideas and choice guides
* Update Openstad React Admin JS to v0.10

## v0.12.0 (2021-02-23)
* Make URL in table overview table a link to the url
* For localhost skip DNS test, allowing development environments to create sites
* React admin via jsdelivr

## v0.11.1 (2021-02-02)
* Remove publish button, not needed anymore happens automatically

## v0.11.0 (2021-01-27)
* Allowing to set ALLOW_HTTP_URLS to ON will allow http:// edit
* Allowing site with urls with subdirectories like domain.com/site1 domain.com/site2

## v0.10.3 (2020-12-16)
* Only allow to select an authentication method that uses e-mail if the user wants to make e-mail a required field.
* For default site don't allow editing of basic auth or delete.

## v0.10.2 (2020-12-09)
* Only allow to select an authentication method that uses e-mail if the user wants to make e-mail an required field.

## v0.10.1 (2020-12-09)
* Log errors while uploading images

## v0.10.0 (2020-12-09)
* Only allow alphanumeric characters in the uniqueidentifier otherwise will cause issues with copying sites

## v0.9.0 (2020-11-17)
* When creating a user, in the role editing table also display the site domain next to the client ID
* Bugfix: fix importing site by adding site name field

## v0.8.2 (2020-11-03)
* Update react-admin
* Update NPM modules for security
* Select for setting defaultRoleId in admin panel


## v0.8.2 (2020-11-03)
* Update react-admin
* Update NPM modules for security
* Select for setting defaultRoleId in admin panel

## v0.8.0-PRERLEASE (2020-17-07)
* Set content-length with Bufferlength for body api proxy, otherwise it breaks with special characters
* Add slash to formatting tmp directory in site export  
* Update corresponding ingress when site URL is changed
* Delete corresponding ingress when a site is deleted

## 0.7.5 (2020-09-29)
* Update openstad logo

## 0.7.4 (2020-09-29)
* Fix mistakes in explanations for idea thank you email

## 0.7.3 (2020-09-29)
* Update hostname in CMS config on url update

## 0.7.2 (2020-09-29)
* Hide old idea import & export buttons

## 0.7.1 (2020-09-16)
* Fix kubernetes site creation, by skipping broken DNS check

## 0.7.0 (2020-09
