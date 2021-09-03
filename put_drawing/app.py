import boto3
import simplejson as json
import logging

from boto3.dynamodb.types import TypeSerializer, TypeDeserializer


def get_response(status, body=None):
    response = {
        "statusCode": status
    }
    
    if body:
        response["body"] = json.dumps(body)
    
    return response


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    serializer = TypeSerializer()
    body = json.loads(event["body"])
    
    try:
        drawing_id = body["id"]
        name = body["name"]
        strokes = body["strokes"]
    except KeyError:
        return get_response(
            status=400,
            body="Request must contain keys for 'id', 'name', and 'strokes'"
        )
    
    try:
        drawings_metadata_item = {
            "id": serializer.serialize(drawing_id),
            "name": serializer.serialize(name)
        }

        response = dynamodb.put_item(
            TableName="drawings_metadata",
            Item=drawings_metadata_item
        )
        
        for stroke in strokes:
            stroke["id"] = drawing_id
        
        logging.error(strokes)

        response = dynamodb.batch_write_item(
            RequestItems={
                "drawings": [
                    {
                        "PutRequest": {
                            "Item": {
                                k: serializer.serialize(v)
                                for k, v in stroke.items()
                            }
                        }
                    } 
                    for stroke in strokes
                ]
            }
        )
    except Exception as e:
        return get_response(status=500, body=str(e))

    return get_response(status=204)
