import boto3
import logging
import simplejson as json

from datetime import datetime

from boto3.dynamodb.types import TypeSerializer


def get_response(status, body=None):
    response = {
        "statusCode": status,
        "headers": {
            "access-control-allow-origin": "*"
        }
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
        stroke_count = len(strokes)
        timestamp = datetime.now().isoformat()
    except KeyError:
        return get_response(
            status=400,
            body="Request must contain keys for 'id', 'name', and 'strokes'"
        )
    
    try:
        drawings_metadata_item = {
            "id": serializer.serialize(drawing_id),
            "name": serializer.serialize(name),
            "stroke_count": serializer.serialize(stroke_count),
            "timestamp": serializer.serialize(timestamp)
        }

        response = dynamodb.put_item(
            TableName="drawings_metadata",
            Item=drawings_metadata_item
        )
        
        for stroke in strokes:
            stroke["id"] = drawing_id
        
        logging.error(strokes)

        # Can only batch write 25 items at a time
        for i in range(0, len(strokes), 25):
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
                        for stroke in strokes[i:i+25]
                    ]
                }
            )
    except Exception as e:
        return get_response(status=500, body=str(e))

    body = {
        "id": drawing_id,
        "name": name,
        "timestamp": timestamp
    }
    return get_response(status=200, body=body)
