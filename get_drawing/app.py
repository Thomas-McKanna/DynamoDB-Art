import boto3
import simplejson as json

from boto3.dynamodb.types import TypeSerializer, TypeDeserializer


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    serializer = TypeSerializer()
    body = json.loads(event["body"])
    
    try:
        drawing_id = body["id"]
    except KeyError:
        return {
            "statusCode": 400,
            "body": "Request must include key for 'id'"
        }
    
    try:
        response = dynamodb.scan(
            ExpressionAttributeValues={
                ":id": serializer.serialize(drawing_id)
            },
            FilterExpression="id = :id",
            TableName="drawings"
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "body": str(e)
        }
        
    items = response["Items"]
    
    if not len(items):
        return {
            "statusCode": 404
        }
    else:
        deserializer = TypeDeserializer()
        return {
            "statusCode": 200,
            "body": json.dumps([
                {
                    k: deserializer.deserialize(v)
                    for k, v in item.items() if k != "id"
                } 
                for item in items
            ])
        }
