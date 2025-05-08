# My People Map App

## Overview
My People Map is a web application that visualizes contact data on a map and provides a spreadsheet view for easy data management. Users can toggle between a map view and a stylized sheet view to interact with their contacts effectively.

## Project Structure
```
my-people-map-app
├── src
│   ├── index.html        # Main HTML document for the application
│   ├── app.js            # Main JavaScript logic for map and data handling
│   ├── styles.css        # Styles for the application
│   └── sheet-view.js     # Logic for rendering the sheet view
├── README.md             # Documentation for the project
```

## Setup Instructions
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd my-people-map-app
   ```

2. **Open the Project**
   Open `src/index.html` in your web browser to view the application.

3. **Dependencies**
   Ensure you have an internet connection as the application fetches data from Google Sheets and uses Mapbox for map rendering.

## Usage Guidelines
- **Map View**: The default view displays contacts on a map. You can click on markers to view contact details.
- **Sheet View**: Click the toggle button in the top left corner to switch to a spreadsheet format that displays all contact data in a table.
- **Search and Sort**: Use the search bar to filter contacts and the dropdown to sort them by first name, last name, or state.

## Development
- **Adding Contacts**: To add or modify contacts, update the Google Sheet linked in the application.
- **Styling**: Modify `src/styles.css` to change the appearance of the application.
- **Functionality**: Update `src/app.js` and `src/sheet-view.js` for any new features or changes in logic.

## License
This project is licensed under the MIT License. See the LICENSE file for details.