# Stock View Application

An application to access and manage data from the Bombay Stock Exchange (BSE).
<br><br>
**Features**
* Script to fetch data from Bombay Stock Exchange (BSE) and upload to MongoDB database
* Express API with several routes to query data from the database
* User Login/Register, User favourites
* Cache layer
* Refresh route to update data

Server is deployed at https://stock-view-application.vercel.app/
<br>Or setup the server locally

## Setup
1. Install `node.js`. Please refer to this link https://nodejs.org/en/download
2. Clone this repository `git clone https://github.com/shrey265/stock_view_application`
3. Go to the project folder and install the dependencies `npm install`.
4. Create a .env file in the project directory and add the following Environment Variables
5. * `MONGODB_CREDENTIALS` Your credentials for a mongodb cluster.
   * Example: mongodb+srv://<cluster_name>:<cluster_password>@cluster0.qq0j30u.mongodb.net/?retryWrites=true&w=majority
   * `PORT` On which you want to run the server.
   * `SECRET` A random string to sign jwt tokens.
   * `CORS_ORIGIN` URL of machine from which you are sending request to the server. If server is running on local machine
     then just put `http://localhost`

## Fetch data from BSE
* Once setup is complete go to `script` directory
* run `node fetch_data.js -y`
* The above command will fetch, extract and parse the latest copy of  Equity Bhav Copy zip from the BSE website then it will upload it to the mongodb database.
* run `node fetch_data.js -f`
* The above command will fetch, the Equity Bhav Copy zip files of last **50 days** (only those files that are available on the BSE website).

## Run the sever
1. Go back to the project directory and run `node index.js`.
2. Now the server is ready to handle requests.

## Routes
* /top_10_stocks  ==> get top 10 stocks based on the latest closing price.
* /stock?name=ULTRATECH CM ==> get latest data of a stock, replace the name of stock in the url to get its data.
* /stock_history?name=BHANSALI ENG  ==> get the 50 days data of a given stock, replace the name of stock in the URL.

* Create a user by a `POST` request on url `https://stock-view-application.vercel.app/add_favourites?username=shrey`
* Body of the request will contain the username and password for the user
{ "username":"shrey",
    "password":123 
    }
* Add favourite stocks to favourite by a `POST` request on url `https://stock-view-application.vercel.app/add_favourites?username=shrey`
* Body of the request will contain a list of favourite stocks (stock name has to be present in the data, these are just examples)
{
  "favourites": ["HDFC","MAHINDRA", "ULTRATECH CM", "SBI", "AMERICAN EXPRESS"]
  }
* Delete a stock from favourites by a `DELETE` request on url `/delete_favourite?username=shrey&stock=HDFC` change the name of the stock in url to delete that stock.
* `/refresh` to refresh the stock data for last 50 days.
* This will create a child process which will run the script `node fetch_data.js -f`.
* Note: The refresh feature is not working at this deployment https://stock-view-application.vercel.app/ because the app is hosted as a serverless function thus creating a child process is a headache. So I have commented the end point for `/refresh`. To test it just uncomment the code after cloning the repository.
 
