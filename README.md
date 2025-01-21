# Project: CareCamps Server
CareCams is simple health camp management system using reactJS, nodeJS, expressJS and mongoDB. This is the backend of the project. The project was developed to implement the learnings of mern stack single page application. CareCamps allows organizer to add and manage health camps. Users/participants can join and manage join camps by logging and paying for the camps.


## Key features of this project
-  When users lands on CareCamps they can see health camps and their informations on the home page and the available camps page. These camps was added by the organizer.  
  
- Every camp details contains a button to view details. Upon clicking tey will be navigated to the details page where they will be able to join camps if logged in. If user is not signed in, he/she will be redirected to the login page. After login or register then can join camps by filling up a simple form from camp details page.  
  
- All the camps from homepage and available camp page was added by the prganizer who was manually added to the app. The authentication system was developed using firebase.  
  
- Logged in users will see their profile picture on the navbar, there they see their username and two button as dashboard and logout. By clicking on that they will be able to logout and navigate to the dashboard upon clicking on the respective button  
  
- By clicking on the dashboard button from navbar, general user/participant will be redirected to the participant dashboard and organizer will be navigated to the organizer dashboad.  
  
- On the organizer dashboard home, there is the profile page on default and there will be analytics page for participant. They can navigate to other page from the sidebar on the left or by clicking the menu icon on smaller devices.  
  
- Organizer can add new camp and update and delete from add camp and manage camps page. Participant manage the camps the joind from campdetails page. They will see a pay button and a cancel button on camp management page. They will be able to pay for the camps and cancel the registration if the payment was not done. If organizer confirms their registration they can see the feedback button if paid and give feedback. Payment system was integrated using stripe. They can see previous payments from payment history page.  
  
- Organizer will be able to cancel and confirm registrations from manage register page. Upon confirmation the cancel button will be disabled if the user pays the camp fees. For adding camp data to the server, images was uploaded to the imgbb server and the returned link was saved to the database.
  
- Pagination, search and sorting systems was implemented on various page for user experience. All the operations for search sort and pagination was done on the server side for the smooth and fast data fetching and showing on the UI. All data are fetched from mongoDB server with tanstack query.  
  
  
- For data security jsonwebtoken was implemented on the server side and these token was used by storing on browser's local storage. For an extra layer of security axios interceptor was used to fetch the secures datas.


## Live Link for this project
- [https://care-camps.web.app/](https://care-camps.web.app/)
- [https://care-camps.netlify.app/](https://care-camps.netlify.app/)