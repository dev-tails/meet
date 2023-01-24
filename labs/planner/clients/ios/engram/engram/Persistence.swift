//
//  Persistence.swift
//  engram
//
//  Created by Adam Berg on 2021-07-02.
//

import Foundation
import CoreData

var persistentContainer: NSPersistentContainer = {
    let storeURL = AppGroup.engram.containerURL.appendingPathComponent("engram.sqlite")
    let description = NSPersistentStoreDescription(url: storeURL)
    
    let container = NSPersistentContainer(name: "engram")
    container.persistentStoreDescriptions = [description]
    
    container.loadPersistentStores { _, error in
        if let error = error as NSError? {
            fatalError("Unresolved error \(error), \(error.userInfo)")
        }
    }
    return container
}()

func saveContext() {
    let context = persistentContainer.viewContext
    
    if context.hasChanges {
        do {
            try context.save()
        } catch {
            let nserror = error as NSError
            fatalError("Unresolved error \(nserror), \(nserror.userInfo)")
        }
    }
}
