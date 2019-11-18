import * as dynamoDbLib from "./dynamodb"; // DynamoDB function created in another file so it can be used in other APIs
import {success, failure} from "./response"; // callback handler function created in another file so it can be used in other APIs
export async function main(event, context, callback) {
  try {
  	// create an empty array to build processed items in the loop for the callback
  	// I'm doing this because due to an effort to simplify this code,
  	// some code is omitted that uses processing logic to omit some items from the callback.
  	// This is done by building an array of items that we want to callback in the API request.
    let itemOrders = [];
    // get orders from a user
    let params = {
      TableName: process.env.orderTableName,
      Key: {userId: 'user-id-here'},
      ProjectionExpression: 'orders'
    };
    const userOrders = await dynamoDbLib.call("get", params);
    if (userOrders.Item.hasOwnProperty('orders')) {
      // loop through each order and process an async await for each iteration by using the asyncForEach function we created
      await asyncForEach(result.Item.orders, async (order) => {
				
				// we can use conditional logic here to see if the order in the loop is one we want to process or not
			  // something like:
			  /* if (order.category === 'Special') {
			  	... do something to process the 'Special' orders
			  } else {
			    ... do something to process the orders that are not 'Special'
			  } */
				
				let itemOrder = {itemId: order.itemId, price: order.price, purchaseDate: order.purchaseDate};
				// query the item table with the order.itemId to get dynamic details of the item that may be changed later
				params = {
					TableName: process.env.itemTableName,
					Key: {UUID: order.itemId},
					ProjectionExpression: "slug, title"
				};
				
				// get the details of the bundle based on the UUID from the bundle
				// that way we can retain a UUID for the item and change the slug or title of the item later
				// without affecting details of the order
				const itemDetails = await dynamoDbLib.call("get", params);
				itemOrder.itemSlug = itemDetails.Item.itemSlug;
				itemOrder.itemTitle = itemDetails.Item.itemTitle;
				// add the processed order to the itemOrders array for the callback
				itemOrders.push(itemOrder);
				
      });
    }
    callback(null, success(sortByKey(itemOrders, 'purchaseDate')));
  } catch (e) {
    console.log(e);
    callback(null, failure(e.message));
  }
}
// use this function to loop through each order and process an async await for each iteration
async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}
// use this function to sort the return object by the purchaseDate
const sortByKey = (array, key) => {
	return array.sort(function(a, b) {
		let x = a[key]; let y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
};